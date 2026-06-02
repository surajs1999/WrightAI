from __future__ import annotations

from dataclasses import dataclass

from core.embeddings.chroma_store import ChromaStore
from core.embeddings.voyage_embeddings import VoyageEmbedder
from core.parser.ast_chunker import CodeChunk
from core.parser.dep_graph import DependencyGraph
from core.parser.tree_sitter_parser import ParsedFunction


@dataclass
class RetrievedContext:
    function: ParsedFunction
    chunk: CodeChunk
    callers: list[tuple[str, str]]
    callees: list[tuple[str, str]]
    vector_score: float
    graph_score: float
    combined_score: float
    total_tokens: int


class HybridRetriever:
    MAX_CONTEXT_TOKENS = 8000
    VECTOR_WEIGHT = 0.6
    GRAPH_WEIGHT = 0.4

    def __init__(
        self,
        chroma_store: ChromaStore,
        dep_graph: DependencyGraph,
        embedder: VoyageEmbedder,
    ) -> None:
        self._store = chroma_store
        self._graph = dep_graph
        self._embedder = embedder
        self._pagerank: dict[str, float] = {}

    def _get_pagerank(self) -> dict[str, float]:
        if not self._pagerank:
            self._pagerank = self._graph.get_pagerank_scores()
        return self._pagerank

    def retrieve_for_function(self, func: ParsedFunction) -> list[RetrievedContext]:
        pagerank = self._get_pagerank()
        callers = self._graph.get_callers(func.name, func.file_path)
        callees = self._graph.get_callees(func.name, func.file_path)

        # Multi-query: embed 3 different perspectives on the function
        param_names = " ".join(p["name"] for p in func.parameters) if func.parameters else ""
        callee_names = " ".join(name for _, name in callees[:5])
        queries = [
            func.source,
            f"{func.name} {param_names}".strip(),
        ]
        if callee_names:
            queries.append(callee_names)

        seen_chunk_ids: set[str] = set()
        all_results: list[RetrievedContext] = []

        for query in queries:
            embedding = self._embedder.embed_query(query)
            for result in self._store.search(embedding, n_results=5):
                if result.chunk_id in seen_chunk_ids:
                    continue
                seen_chunk_ids.add(result.chunk_id)
                chunk = CodeChunk(
                    chunk_id=result.chunk_id,
                    file_path=result.file_path,
                    language=result.language,
                    chunk_type=result.chunk_type,
                    name=result.name,
                    source=result.source,
                    start_line=result.start_line,
                    end_line=result.end_line,
                    token_count=len(result.source) // 4,
                )
                vector_score = 1.0 - result.distance
                node_id = f"{result.file_path}::{result.name}"
                graph_score = pagerank.get(node_id, 0.0)
                ctx_func = ParsedFunction(
                    name=result.name,
                    language=result.language,
                    file_path=result.file_path,
                    start_byte=0,
                    end_byte=0,
                    start_line=result.start_line,
                    end_line=result.end_line,
                    source=result.source,
                    existing_docstring=None,
                    parameters=[],
                    return_type=None,
                    is_async=False,
                    decorators=[],
                )
                all_results.append(RetrievedContext(
                    function=ctx_func,
                    chunk=chunk,
                    callers=[],
                    callees=[],
                    vector_score=vector_score,
                    graph_score=graph_score,
                    combined_score=self._combine_scores(vector_score, graph_score),
                    total_tokens=chunk.token_count,
                ))

        # Ensure the function itself is always first (as primary context with callers/callees)
        primary_chunk: CodeChunk | None = None
        primary_vector_score = 0.0
        for ctx in all_results:
            if ctx.chunk.name == func.name and ctx.chunk.file_path == func.file_path:
                primary_chunk = ctx.chunk
                primary_vector_score = ctx.vector_score
                all_results.remove(ctx)
                break

        if primary_chunk is None:
            primary_chunk = CodeChunk(
                chunk_id="",
                file_path=func.file_path,
                language=func.language,
                chunk_type="function",
                name=func.name,
                source=func.source,
                start_line=func.start_line,
                end_line=func.end_line,
                token_count=len(func.source) // 4,
            )

        node_id = f"{func.file_path}::{func.name}"
        graph_score = pagerank.get(node_id, 0.0)
        primary = RetrievedContext(
            function=func,
            chunk=primary_chunk,
            callers=callers,
            callees=callees,
            vector_score=primary_vector_score,
            graph_score=graph_score,
            combined_score=self._combine_scores(primary_vector_score, graph_score),
            total_tokens=primary_chunk.token_count,
        )

        # Fetch source for top 2 callers and top 2 callees from the store
        related: list[RetrievedContext] = []
        for file_path, func_name in (callers[:2] + callees[:2]):
            if f"{file_path}::{func_name}" in seen_chunk_ids:
                continue
            results = self._store.search(
                self._embedder.embed_query(func_name),
                n_results=1,
                filter={"file_path": file_path},
            )
            if not results:
                continue
            r = results[0]
            chunk_key = f"{r.file_path}::{r.name}"
            if chunk_key in seen_chunk_ids:
                continue
            seen_chunk_ids.add(chunk_key)
            chunk = CodeChunk(
                chunk_id=r.chunk_id,
                file_path=r.file_path,
                language=r.language,
                chunk_type=r.chunk_type,
                name=r.name,
                source=r.source,
                start_line=r.start_line,
                end_line=r.end_line,
                token_count=len(r.source) // 4,
            )
            ctx_func = ParsedFunction(
                name=r.name,
                language=r.language,
                file_path=r.file_path,
                start_byte=0,
                end_byte=0,
                start_line=r.start_line,
                end_line=r.end_line,
                source=r.source,
                existing_docstring=None,
                parameters=[],
                return_type=None,
                is_async=False,
                decorators=[],
            )
            vs = 1.0 - r.distance
            gs = pagerank.get(f"{r.file_path}::{r.name}", 0.0)
            related.append(RetrievedContext(
                function=ctx_func,
                chunk=chunk,
                callers=[],
                callees=[],
                vector_score=vs,
                graph_score=gs,
                combined_score=self._combine_scores(vs, gs),
                total_tokens=chunk.token_count,
            ))

        # Sort remaining by combined score, prepend primary
        all_results.sort(key=lambda c: c.combined_score, reverse=True)
        final = [primary] + all_results[:4] + related
        return self._trim_to_token_budget(final)

    def retrieve_for_query(self, query: str, n: int = 5) -> list[RetrievedContext]:
        query_embedding = self._embedder.embed_query(query)
        search_results = self._store.search(query_embedding, n_results=n * 2)

        pagerank = self._get_pagerank()
        contexts: list[RetrievedContext] = []

        seen_chunks: set[str] = set()
        for result in search_results:
            if result.chunk_id in seen_chunks:
                continue
            seen_chunks.add(result.chunk_id)

            vector_score = 1.0 - result.distance
            node_id = f"{result.file_path}::{result.name}"
            graph_score = pagerank.get(node_id, 0.0)
            combined_score = self._combine_scores(vector_score, graph_score)

            chunk = CodeChunk(
                chunk_id=result.chunk_id,
                file_path=result.file_path,
                language=result.language,
                chunk_type=result.chunk_type,
                name=result.name,
                source=result.source,
                start_line=result.start_line,
                end_line=result.end_line,
                token_count=len(result.source) // 4,
            )

            # Create a minimal ParsedFunction for context
            func = ParsedFunction(
                name=result.name,
                language=result.language,
                file_path=result.file_path,
                start_byte=0,
                end_byte=0,
                start_line=result.start_line,
                end_line=result.end_line,
                source=result.source,
                existing_docstring=None,
                parameters=[],
                return_type=None,
                is_async=False,
                decorators=[],
            )

            context = RetrievedContext(
                function=func,
                chunk=chunk,
                callers=[],
                callees=[],
                vector_score=vector_score,
                graph_score=graph_score,
                combined_score=combined_score,
                total_tokens=chunk.token_count,
            )
            contexts.append(context)

        contexts.sort(key=lambda c: c.combined_score, reverse=True)
        contexts = contexts[:n]

        # If weak results (< 3 chunks or all low-confidence), pad with high-PageRank chunks
        MIN_SCORE_THRESHOLD = 0.3
        weak = len(contexts) < 3 or all(c.vector_score < MIN_SCORE_THRESHOLD for c in contexts)
        if weak:
            contexts = self._pad_with_top_pagerank(contexts, seen_chunks, n)

        return self._trim_to_token_budget(contexts)

    def _pad_with_top_pagerank(
        self,
        existing: list[RetrievedContext],
        seen_chunks: set[str],
        n: int,
    ) -> list[RetrievedContext]:
        pagerank = self._get_pagerank()
        if not pagerank:
            return existing

        top_nodes = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)[: n * 3]
        for node_id, score in top_nodes:
            if len(existing) >= n:
                break
            try:
                file_path, func_name = node_id.rsplit("::", 1)
            except ValueError:
                continue
            results = self._store.search(
                self._embedder.embed_query(func_name),
                n_results=1,
                filter={"file_path": file_path},
            )
            if not results:
                continue
            result = results[0]
            if result.chunk_id in seen_chunks:
                continue
            seen_chunks.add(result.chunk_id)
            chunk = CodeChunk(
                chunk_id=result.chunk_id,
                file_path=result.file_path,
                language=result.language,
                chunk_type=result.chunk_type,
                name=result.name,
                source=result.source,
                start_line=result.start_line,
                end_line=result.end_line,
                token_count=len(result.source) // 4,
            )
            func = ParsedFunction(
                name=result.name,
                language=result.language,
                file_path=result.file_path,
                start_byte=0,
                end_byte=0,
                start_line=result.start_line,
                end_line=result.end_line,
                source=result.source,
                existing_docstring=None,
                parameters=[],
                return_type=None,
                is_async=False,
                decorators=[],
            )
            existing.append(
                RetrievedContext(
                    function=func,
                    chunk=chunk,
                    callers=[],
                    callees=[],
                    vector_score=0.0,
                    graph_score=score,
                    combined_score=self._combine_scores(0.0, score),
                    total_tokens=chunk.token_count,
                )
            )
        return existing

    def _combine_scores(self, vector_score: float, graph_score: float) -> float:
        # Normalize graph score to [0, 1] assuming max pagerank ~0.1 for large graphs
        normalized_graph = min(graph_score * 10.0, 1.0)
        return self.VECTOR_WEIGHT * vector_score + self.GRAPH_WEIGHT * normalized_graph

    def _trim_to_token_budget(self, contexts: list[RetrievedContext]) -> list[RetrievedContext]:
        total = 0
        trimmed: list[RetrievedContext] = []
        for ctx in contexts:
            if total + ctx.total_tokens > self.MAX_CONTEXT_TOKENS:
                break
            trimmed.append(ctx)
            total += ctx.total_tokens
        return trimmed
