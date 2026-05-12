"""Tests for hybrid retriever."""

from __future__ import annotations

from unittest.mock import MagicMock


from core.embeddings.chroma_store import SearchResult
from core.retrieval.hybrid_retriever import HybridRetriever


def _make_mock_store(results: list[SearchResult]) -> MagicMock:
    """
    Creates a mock store object with a search method that returns predefined results.

    This helper function is used in tests to create a MagicMock object that simulates a search store. The mock's search method is configured to return the provided list of SearchResult objects, allowing tests to verify retrieval behavior without requiring an actual store implementation.

    Args:
        results (list[SearchResult]): The list of SearchResult objects that the mock store's search method will return.

    Returns:
        MagicMock: A MagicMock object configured with a search method that returns the specified results.

    Example:
        ```
        mock_store = _make_mock_store([SearchResult(text='example', score=0.95)])
        ```
    """
    store = MagicMock()
    store.search.return_value = results
    return store


def _make_mock_graph() -> MagicMock:
    """
    Creates and configures a MagicMock object that simulates a graph interface with empty callers, callees, and pagerank scores for testing purposes.

    This helper function is used in unit tests to create a mock graph object with pre-configured return values. The mock graph returns empty lists for get_callers and get_callees methods, and an empty dictionary for get_pagerank_scores method, simulating a graph with no relationships or scores.

    Returns:
        MagicMock: A configured MagicMock instance representing a graph with empty callers, callees, and pagerank scores.

    Example:
        ```
        mock_graph = _make_mock_graph()
        ```
    """
    graph = MagicMock()
    graph.get_callers.return_value = []
    graph.get_callees.return_value = []
    graph.get_pagerank_scores.return_value = {}
    return graph


def _make_mock_embedder() -> MagicMock:
    """
    Creates a mock embedder object configured to return a fixed 384-dimensional embedding vector.

    This is a test utility function that creates a MagicMock instance simulating an embedder. The mock's embed_query method is configured to always return a 384-dimensional vector with all values set to 0.1, which is useful for testing retrieval functionality without requiring an actual embedding model.

    Returns:
        MagicMock: A MagicMock object with embed_query method configured to return a list of 384 elements, each with value 0.1.

    Example:
        ```
        embedder = _make_mock_embedder()
        embedding = embedder.embed_query("test query")  # Returns [0.1] * 384
        ```
    """
    embedder = MagicMock()
    embedder.embed_query.return_value = [0.1] * 384
    return embedder


def test_retrieve_for_query_returns_contexts() -> None:
    """
    Tests that the HybridRetriever.retrieve_for_query method successfully retrieves and returns context objects with correct function metadata and vector scores.

    This unit test validates the core retrieval functionality by creating a mock search result containing a Python function, passing it through a HybridRetriever instance with mocked dependencies (store, graph, embedder), and asserting that the retrieved contexts match expected properties including function name and positive vector score.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_retrieve_for_query_returns_contexts()
        ```
    """
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
    """
    Tests that the HybridRetriever's _combine_scores method correctly weights vector and graph scores according to predefined constants.

    Verifies the score combination logic by testing two scenarios: (1) when only vector score is present, the combined score should equal VECTOR_WEIGHT, and (2) when only graph score is present, the combined score should equal GRAPH_WEIGHT multiplied by the normalized (scaled by 10 and capped at 1.0) graph score.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_combine_scores_weights()
        ```
    """
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
    """
    Tests that the HybridRetriever._trim_to_token_budget method correctly reduces a list of retrieved contexts to fit within the maximum token budget.

    Creates three RetrievedContext objects each with 3000 tokens (total 9000 tokens), then verifies that the _trim_to_token_budget method reduces the total token count to be within the HybridRetriever.MAX_CONTEXT_TOKENS limit. Uses mock objects for the store, graph, and embedder components.

    Returns:
        None: This is a test function that performs assertions and returns nothing.

    Example:
        ```
        test_trim_to_token_budget()
        ```
    """
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
