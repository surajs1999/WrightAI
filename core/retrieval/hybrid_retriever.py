from __future__ import annotations

from dataclasses import dataclass, field

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

    def retrieve_for_function(self, func: ParsedFunction) -> RetrievedContext:
        query_embedding = self._embedder.embed_query(func.source)
        search_results = self._store.search(query_embedding, n_results=5)

        # Build a representative chunk for the function itself
        best_chunk: CodeChunk | None = None
        best_vector_score = 0.0

        for result in search_results:
            if result.name == func.name and result.file_path == func.file_path:
                best_chunk = CodeChunk(
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
                best_vector_score = 1.0 - result.distance
                break

        if best_chunk is None:
            # Create chunk from the function itself
            best_chunk = CodeChunk(
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

        pagerank = self._get_pagerank()
        node_id = f"{func.file_path}::{func.name}"
        graph_score = pagerank.get(node_id, 0.0)
        combined_score = self._combine_scores(best_vector_score, graph_score)

        callers = self._graph.get_callers(func.name, func.file_path)
        callees = self._graph.get_callees(func.name, func.file_path)

        return RetrievedContext(
            function=func,
            chunk=best_chunk,
            callers=callers,
            callees=callees,
            vector_score=best_vector_score,
            graph_score=graph_score,
            combined_score=combined_score,
            total_tokens=best_chunk.token_count,
        )

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
        return self._trim_to_token_budget(contexts)

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
