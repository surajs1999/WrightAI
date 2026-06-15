from __future__ import annotations

import json
import logging
from typing import Any

from core.embeddings.chroma_store import SearchResult
from core.parser.ast_chunker import CodeChunk

_logger = logging.getLogger("wright.pgvector")

_TABLE = "code_embeddings"
_UPSERT_BATCH_SIZE = 100
_PAGE_SIZE = 1000


def _db():
    from api.user_store import _db as _get_db

    return _get_db()


class PgVectorStore:
    """Supabase pgvector-backed mirror of a repo's Chroma collection.

    Every method is best-effort: Supabase may be unconfigured (``_db()``
    raises ``RuntimeError``) or briefly unreachable, and none of that should
    ever break local indexing or retrieval.
    """

    def __init__(self, user_id: str, repo_slug: str) -> None:
        self._user_id = user_id
        self._repo_slug = repo_slug

    def count(self) -> int:
        try:
            result = (
                _db()
                .table(_TABLE)
                .select("chunk_id", count="exact")
                .eq("user_id", self._user_id)
                .eq("repo_slug", self._repo_slug)
                .limit(1)
                .execute()
            )
            return result.count or 0
        except Exception:
            _logger.exception("pgvector count failed for %s/%s", self._user_id, self._repo_slug)
            return 0

    def upsert_chunks(self, chunks: list[CodeChunk], embeddings: list[list[float]]) -> None:
        if not chunks:
            return

        rows = [
            {
                "user_id": self._user_id,
                "repo_slug": self._repo_slug,
                "chunk_id": chunk.chunk_id,
                "file_path": chunk.file_path,
                "language": chunk.language,
                "chunk_type": chunk.chunk_type,
                "name": chunk.name,
                "source": chunk.source,
                "start_line": chunk.start_line,
                "end_line": chunk.end_line,
                "token_count": chunk.token_count,
                "embedding": embedding,
            }
            for chunk, embedding in zip(chunks, embeddings)
        ]

        try:
            db = _db()
            for i in range(0, len(rows), _UPSERT_BATCH_SIZE):
                batch = rows[i : i + _UPSERT_BATCH_SIZE]
                db.table(_TABLE).upsert(batch, on_conflict="user_id,repo_slug,chunk_id").execute()
        except Exception:
            _logger.exception("pgvector upsert failed for %s/%s", self._user_id, self._repo_slug)

    def search(
        self,
        query_embedding: list[float],
        n_results: int = 10,
        filter: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        try:
            params = {
                "query_embedding": query_embedding,
                "match_user_id": self._user_id,
                "match_repo_slug": self._repo_slug,
                "match_count": n_results,
                "filter_file_path": (filter or {}).get("file_path"),
            }
            result = _db().rpc("match_code_chunks", params).execute()
        except Exception:
            _logger.exception("pgvector search failed for %s/%s", self._user_id, self._repo_slug)
            return []

        return [
            SearchResult(
                chunk_id=row["chunk_id"],
                file_path=row["file_path"],
                language=row.get("language") or "",
                chunk_type=row.get("chunk_type") or "",
                name=row.get("name") or "",
                source=row.get("source") or "",
                start_line=row.get("start_line") or 0,
                end_line=row.get("end_line") or 0,
                distance=float(row["distance"]),
            )
            for row in (result.data or [])
        ]

    def get_all_chunks(self) -> tuple[list[CodeChunk], list[list[float]]]:
        chunks: list[CodeChunk] = []
        embeddings: list[list[float]] = []

        try:
            db = _db()
            offset = 0
            while True:
                result = (
                    db.table(_TABLE)
                    .select("*")
                    .eq("user_id", self._user_id)
                    .eq("repo_slug", self._repo_slug)
                    .range(offset, offset + _PAGE_SIZE - 1)
                    .execute()
                )
                rows = result.data or []
                for row in rows:
                    embedding = row["embedding"]
                    if isinstance(embedding, str):
                        embedding = json.loads(embedding)
                    embeddings.append(embedding)
                    chunks.append(
                        CodeChunk(
                            chunk_id=row["chunk_id"],
                            file_path=row["file_path"],
                            language=row.get("language") or "",
                            chunk_type=row.get("chunk_type") or "",
                            name=row.get("name") or "",
                            source=row.get("source") or "",
                            start_line=row.get("start_line") or 0,
                            end_line=row.get("end_line") or 0,
                            token_count=row.get("token_count") or 0,
                        )
                    )
                if len(rows) < _PAGE_SIZE:
                    break
                offset += _PAGE_SIZE
        except Exception:
            _logger.exception(
                "pgvector get_all_chunks failed for %s/%s", self._user_id, self._repo_slug
            )
            return [], []

        return chunks, embeddings

    def delete_collection(self) -> None:
        try:
            _db().table(_TABLE).delete().eq("user_id", self._user_id).eq(
                "repo_slug", self._repo_slug
            ).execute()
        except Exception:
            _logger.exception(
                "pgvector delete_collection failed for %s/%s", self._user_id, self._repo_slug
            )


class DualVectorStore:
    """`.search()`-compatible store that prefers the Supabase pgvector backup
    over the local Chroma store, falling back to Chroma if pgvector is
    unavailable or has no results yet (e.g. mid cold-start rebuild).
    """

    def __init__(self, pg_store: PgVectorStore, chroma_store: Any) -> None:
        self._pg = pg_store
        self._chroma = chroma_store

    def search(
        self,
        query_embedding: list[float],
        n_results: int = 10,
        filter: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        results = self._pg.search(query_embedding, n_results, filter)
        if results:
            return results
        return self._chroma.search(query_embedding, n_results, filter)
