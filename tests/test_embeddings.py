"""Tests for embeddings (mocked to avoid API calls)."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from core.embeddings.chroma_store import ChromaStore
from core.parser.ast_chunker import CodeChunk


def test_chroma_store_upsert_and_search(tmp_path) -> None:
    """
    Tests the ChromaStore upsert and search functionality by inserting a code chunk with embeddings and verifying retrieval.

    This test function validates the ChromaStore's ability to persist code chunks with their embeddings and retrieve them through similarity search. It creates a temporary ChromaStore instance, inserts a single CodeChunk with a 384-dimensional embedding vector, verifies the collection size, and confirms that searching with the same embedding vector returns the expected code chunk.

    Args:
        tmp_path (pathlib.Path): Pytest fixture providing a temporary directory path for storing ChromaDB data during the test.

    Returns:
        None: This function does not return a value; it performs assertions to validate ChromaStore behavior.

    Example:
        ```
        test_chroma_store_upsert_and_search(tmp_path)
        ```
    """
    store = ChromaStore(persist_path=str(tmp_path / "chroma"), repo_root=str(tmp_path))
    chunks = [
        CodeChunk(
            chunk_id="test-id-1",
            file_path="test.py",
            language="python",
            chunk_type="function",
            name="my_func",
            source="def my_func(x): return x",
            start_line=0,
            end_line=1,
            token_count=10,
        )
    ]
    # Use a simple 384-dim vector (ChromaDB's default)
    embeddings = [[0.1] * 384]
    store.upsert_chunks(chunks, embeddings)
    assert store.collection_size() == 1

    results = store.search([0.1] * 384, n_results=5)
    assert len(results) == 1
    assert results[0].name == "my_func"


def test_chroma_store_delete_file(tmp_path) -> None:
    """
    Tests that ChromaStore correctly deletes all chunks associated with a specific file path.

    This test verifies the delete_file functionality by creating a ChromaStore instance, inserting a single code chunk for a file, confirming the collection size is 1, deleting the file, and asserting the collection size returns to 0.

    Args:
        tmp_path (Path): Pytest fixture providing a temporary directory path for test isolation.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_chroma_store_delete_file(tmp_path)
        ```
    """
    store = ChromaStore(persist_path=str(tmp_path / "chroma"), repo_root=str(tmp_path))
    chunks = [
        CodeChunk(
            chunk_id="del-id-1",
            file_path="/tmp/delete_me.py",
            language="python",
            chunk_type="function",
            name="to_delete",
            source="def to_delete(): pass",
            start_line=0,
            end_line=0,
            token_count=5,
        )
    ]
    store.upsert_chunks(chunks, [[0.2] * 384])
    assert store.collection_size() == 1
    store.delete_file("/tmp/delete_me.py")
    assert store.collection_size() == 0


def test_voyage_embedder_requires_key() -> None:
    """
    Tests that VoyageEmbedder raises RuntimeError when instantiated without a valid API key and no fallback provider is available.

    This test verifies the error handling behavior of the VoyageEmbedder class by ensuring it properly raises a RuntimeError with the message 'No embedding provider' when initialized with an empty API key string and all environment variables are cleared to prevent fallback to alternative providers like OpenAI.

    Returns:
        None: This test function does not return any value.

    Example:
        ```
        test_voyage_embedder_requires_key()
        ```
    """
    from core.embeddings.voyage_embeddings import VoyageEmbedder

    with pytest.raises(RuntimeError, match="No embedding provider"):
        # No key and no openai fallback available
        with patch.dict("os.environ", {}, clear=True):
            VoyageEmbedder(api_key="")
