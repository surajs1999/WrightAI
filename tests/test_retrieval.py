"""Tests for hybrid retriever."""

from __future__ import annotations

from unittest.mock import MagicMock


from core.embeddings.chroma_store import SearchResult
from core.retrieval.hybrid_retriever import HybridRetriever


def _make_mock_store(results: list[SearchResult]) -> MagicMock:
    store = MagicMock()
    store.search.return_value = results
    return store


def _make_mock_graph() -> MagicMock:
    graph = MagicMock()
    graph.get_callers.return_value = []
    graph.get_callees.return_value = []
    graph.get_pagerank_scores.return_value = {}
    return graph


def _make_mock_embedder() -> MagicMock:
    embedder = MagicMock()
    embedder.embed_query.return_value = [0.1] * 384
    return embedder


def test_retrieve_for_query_returns_contexts() -> None:
    results = [
        SearchResult(
            chunk_id="c1",
            file_path="foo.py",
            language="python",
            chunk_type="function",
            name="my_func",
            source="def my_func(): pass",
            start_line=0,
            end_line=1,
            distance=0.1,
        )
    ]
    store = _make_mock_store(results)
    graph = _make_mock_graph()
    embedder = _make_mock_embedder()

    retriever = HybridRetriever(store, graph, embedder)
    contexts = retriever.retrieve_for_query("what does my_func do?", n=5)

    assert len(contexts) == 1
    assert contexts[0].function.name == "my_func"
    assert contexts[0].vector_score > 0


def test_combine_scores_weights() -> None:
    store = _make_mock_store([])
    graph = _make_mock_graph()
    embedder = _make_mock_embedder()
    retriever = HybridRetriever(store, graph, embedder)

    score = retriever._combine_scores(vector_score=1.0, graph_score=0.0)
    assert abs(score - HybridRetriever.VECTOR_WEIGHT) < 0.01

    score = retriever._combine_scores(vector_score=0.0, graph_score=0.1)
    expected = HybridRetriever.GRAPH_WEIGHT * min(0.1 * 10, 1.0)
    assert abs(score - expected) < 0.01


def test_trim_to_token_budget() -> None:
    from core.retrieval.hybrid_retriever import RetrievedContext
    from core.parser.ast_chunker import CodeChunk
    from core.parser.tree_sitter_parser import ParsedFunction

    def _make_ctx(tokens: int, name: str) -> RetrievedContext:
        func = ParsedFunction(
            name=name,
            language="python",
            file_path="f.py",
            start_byte=0,
            end_byte=0,
            start_line=0,
            end_line=0,
            source="",
            existing_docstring=None,
            parameters=[],
            return_type=None,
            is_async=False,
            decorators=[],
        )
        chunk = CodeChunk(
            chunk_id=name,
            file_path="f.py",
            language="python",
            chunk_type="function",
            name=name,
            source="x" * (tokens * 4),
            start_line=0,
            end_line=0,
            token_count=tokens,
        )
        return RetrievedContext(
            function=func,
            chunk=chunk,
            callers=[],
            callees=[],
            vector_score=1.0,
            graph_score=0.0,
            combined_score=1.0,
            total_tokens=tokens,
        )

    store = _make_mock_store([])
    graph = _make_mock_graph()
    embedder = _make_mock_embedder()
    retriever = HybridRetriever(store, graph, embedder)

    contexts = [_make_ctx(3000, "a"), _make_ctx(3000, "b"), _make_ctx(3000, "c")]
    trimmed = retriever._trim_to_token_budget(contexts)
    total = sum(c.total_tokens for c in trimmed)
    assert total <= HybridRetriever.MAX_CONTEXT_TOKENS
