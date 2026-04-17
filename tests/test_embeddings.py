"""Tests for embeddings (mocked to avoid API calls)."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from core.embeddings.chroma_store import ChromaStore, SearchResult
from core.parser.ast_chunker import CodeChunk


def test_chroma_store_upsert_and_search(tmp_path) -> None:
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
    from core.embeddings.voyage_embeddings import VoyageEmbedder
    with pytest.raises(RuntimeError, match="No embedding provider"):
        # No key and no openai fallback available
        with patch.dict("os.environ", {}, clear=True):
            embedder = VoyageEmbedder(api_key="")
