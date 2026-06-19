from __future__ import annotations

import logging
import shutil
import threading
import time
from pathlib import Path

_logger = logging.getLogger("wright.chroma_cache")

_cache: dict[str, tuple[object, float]] = {}
_lock = threading.Lock()
_TTL = 300  # seconds — accept up to 5 min staleness from cross-container writes
_restored_paths: set[str] = set()  # per persist_path, one-time GCS restore


def _restore_chroma_from_gcs(persist_path: str, repo_root: str) -> None:
    """Copy the per-user/repo GCS backup into persist_path on first access."""
    from api.routes.repos import _parse_repo_root  # lazy — avoids circular import

    dst = Path(persist_path)
    if dst.exists():
        return
    parsed = _parse_repo_root(repo_root)
    src = Path("/data/chroma") / parsed[0] / parsed[1] if parsed else Path("/data/chroma")
    if src.exists():
        try:
            shutil.copytree(str(src), str(dst))
        except Exception as e:
            _logger.warning("ChromaDB GCS restore failed for %s: %s", persist_path, e)


def get(persist_path: str, repo_root: str):
    """Return a cached ChromaStore, creating one if missing or TTL-expired.

    Opening a PersistentClient on GCS Fuse loads SQLite and the HNSW index from
    the network filesystem — ~1-3 s per cold open. Caching the instance means
    only the first request per (path, repo_root) per container pays that cost;
    subsequent requests reuse the warm in-memory index (~10-50 ms).

    If the resulting store is empty (fresh /tmp on a cold container, with no
    /data/chroma backup either), it's repopulated from the Supabase pgvector
    backup — the durable source of truth for bidirectional sync.
    """
    from core.embeddings.chroma_store import ChromaStore

    key = f"{persist_path}::{repo_root}"
    now = time.monotonic()
    needs_rebuild = False
    needs_restore = False
    with _lock:
        if persist_path not in _restored_paths:
            _restored_paths.add(persist_path)
            needs_restore = True
    if needs_restore:
        _restore_chroma_from_gcs(persist_path, repo_root)
    with _lock:
        if key in _cache:
            store, ts = _cache[key]
            if now - ts < _TTL:
                return store
        store = ChromaStore(persist_path=persist_path, repo_root=repo_root)
        _cache[key] = (store, now)
        needs_rebuild = store.count() == 0

    if needs_rebuild:
        _rebuild_from_pgvector(store, repo_root)
    return store


def _rebuild_from_pgvector(store, repo_root: str) -> None:
    """Repopulate a freshly-created, empty ChromaStore from its Supabase
    pgvector backup (e.g. on a cold container start with no /data/chroma)."""
    from api.routes.repos import _parse_repo_root  # lazy import, avoids circular import

    parsed = _parse_repo_root(repo_root)
    if parsed is None:
        return

    from core.embeddings.pgvector_store import PgVectorStore

    chunks, embeddings = PgVectorStore(*parsed).get_all_chunks()
    if chunks:
        store.upsert_chunks(chunks, embeddings)
        _logger.info(
            "Rebuilt local chroma for %s from pgvector (%d chunks)", repo_root, len(chunks)
        )


def invalidate(persist_path: str, repo_root: str) -> None:
    """Drop the cached entry so the next request reloads from disk.

    Call this after a successful upsert to force the cache to reflect newly
    written embeddings on the next request.
    """
    key = f"{persist_path}::{repo_root}"
    with _lock:
        _cache.pop(key, None)
