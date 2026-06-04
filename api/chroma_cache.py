from __future__ import annotations

import threading
import time

_cache: dict[str, tuple[object, float]] = {}
_lock = threading.Lock()
_TTL = 300  # seconds — accept up to 5 min staleness from cross-container writes


def get(persist_path: str, repo_root: str):
    """Return a cached ChromaStore, creating one if missing or TTL-expired.

    Opening a PersistentClient on GCS Fuse loads SQLite and the HNSW index from
    the network filesystem — ~1-3 s per cold open. Caching the instance means
    only the first request per (path, repo_root) per container pays that cost;
    subsequent requests reuse the warm in-memory index (~10-50 ms).
    """
    from core.embeddings.chroma_store import ChromaStore

    key = f"{persist_path}::{repo_root}"
    now = time.monotonic()
    with _lock:
        if key in _cache:
            store, ts = _cache[key]
            if now - ts < _TTL:
                return store
        store = ChromaStore(persist_path=persist_path, repo_root=repo_root)
        _cache[key] = (store, now)
        return store


def invalidate(persist_path: str, repo_root: str) -> None:
    """Drop the cached entry so the next request reloads from disk.

    Call this after a successful upsert to force the cache to reflect newly
    written embeddings on the next request.
    """
    key = f"{persist_path}::{repo_root}"
    with _lock:
        _cache.pop(key, None)
