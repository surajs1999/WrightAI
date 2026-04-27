from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass
from typing import Any

import chromadb
from chromadb.config import Settings

from core.parser.ast_chunker import CodeChunk


@dataclass
class SearchResult:
    chunk_id: str
    file_path: str
    language: str
    chunk_type: str
    name: str
    source: str
    start_line: int
    end_line: int
    distance: float


class ChromaStore:
    def __init__(self, persist_path: str, repo_root: str = ".") -> None:
        self._persist_path = persist_path
        repo_hash = hashlib.md5(repo_root.encode()).hexdigest()[:8]
        self._collection_name = f"wright_{repo_hash}"
        os.makedirs(persist_path, exist_ok=True)
        os.chmod(persist_path, 0o700)
        self._client = chromadb.PersistentClient(
            path=persist_path,
            settings=Settings(anonymized_telemetry=False),
        )
        self._collection = self._client.get_or_create_collection(
            name=self._collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def upsert_chunks(self, chunks: list[CodeChunk], embeddings: list[list[float]]) -> None:
        if not chunks:
            return

        ids = [chunk.chunk_id for chunk in chunks]
        documents = [chunk.source for chunk in chunks]
        metadatas = [
            {
                "file_path": chunk.file_path,
                "language": chunk.language,
                "chunk_type": chunk.chunk_type,
                "name": chunk.name,
                "start_line": chunk.start_line,
                "end_line": chunk.end_line,
                "token_count": chunk.token_count,
            }
            for chunk in chunks
        ]

        self._collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )

    def search(
        self,
        query_embedding: list[float],
        n_results: int = 10,
        filter: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        kwargs: dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": min(n_results, self._collection.count() or 1),
        }
        if filter:
            kwargs["where"] = filter

        results = self._collection.query(**kwargs)

        search_results: list[SearchResult] = []
        if not results["ids"] or not results["ids"][0]:
            return search_results

        for i, doc_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i]
            doc = results["documents"][0][i] if results["documents"] else ""
            dist = results["distances"][0][i] if results["distances"] else 0.0
            search_results.append(
                SearchResult(
                    chunk_id=doc_id,
                    file_path=meta.get("file_path", ""),
                    language=meta.get("language", ""),
                    chunk_type=meta.get("chunk_type", ""),
                    name=meta.get("name", ""),
                    source=doc,
                    start_line=int(meta.get("start_line", 0)),
                    end_line=int(meta.get("end_line", 0)),
                    distance=float(dist),
                )
            )
        return search_results

    def delete_file(self, file_path: str) -> None:
        results = self._collection.get(where={"file_path": file_path})
        if results["ids"]:
            self._collection.delete(ids=results["ids"])

    def get_chunk_by_id(self, chunk_id: str) -> CodeChunk | None:
        results = self._collection.get(ids=[chunk_id])
        if not results["ids"]:
            return None
        meta = results["metadatas"][0]
        doc = results["documents"][0] if results["documents"] else ""
        return CodeChunk(
            chunk_id=chunk_id,
            file_path=meta.get("file_path", ""),
            language=meta.get("language", ""),
            chunk_type=meta.get("chunk_type", ""),
            name=meta.get("name", ""),
            source=doc,
            start_line=int(meta.get("start_line", 0)),
            end_line=int(meta.get("end_line", 0)),
            token_count=int(meta.get("token_count", 0)),
        )

    def collection_size(self) -> int:
        return self._collection.count()
