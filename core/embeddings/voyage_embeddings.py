from __future__ import annotations

import os
from typing import Any

from core.parser.ast_chunker import CodeChunk


class VoyageEmbedder:
    MODEL = "voyage-code-3"
    BATCH_SIZE = 128

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key
        self._client: Any = None
        self._fallback: Any = None
        self._use_voyage = bool(api_key)
        self._init_client()

    def _init_client(self) -> None:
        if self._use_voyage:
            try:
                import voyageai
                self._client = voyageai.Client(api_key=self._api_key)
                return
            except ImportError:
                pass

        # Fallback to OpenAI
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            try:
                import openai
                self._fallback = openai.OpenAI(api_key=openai_key)
                self._use_voyage = False
                return
            except ImportError:
                pass

        raise RuntimeError(
            "No embedding provider available. Set VOYAGE_API_KEY (recommended) or OPENAI_API_KEY. "
            "Install: pip install voyageai  OR  pip install openai"
        )

    def embed_chunks(self, chunks: list[CodeChunk]) -> list[list[float]]:
        texts = [chunk.source for chunk in chunks]
        return self.embed_batch(texts)

    def embed_query(self, query: str) -> list[float]:
        return self.embed_batch([query])[0]

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        all_embeddings: list[list[float]] = []
        for i in range(0, len(texts), self.BATCH_SIZE):
            batch = texts[i : i + self.BATCH_SIZE]
            if self._use_voyage and self._client:
                result = self._client.embed(batch, model=self.MODEL, input_type="document")
                all_embeddings.extend(result.embeddings)
            elif self._fallback:
                response = self._fallback.embeddings.create(
                    input=batch,
                    model="text-embedding-3-small",
                )
                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)
            else:
                raise RuntimeError("No embedding client initialized")

        return all_embeddings
