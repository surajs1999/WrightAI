from __future__ import annotations

import os

_embedder = None
_gateway = None


def get_embedder():
    """Return the process-level VoyageEmbedder singleton.

    Creating a new VoyageEmbedder on every request initialises a voyageai.Client
    object each time. This singleton avoids that overhead while keeping the API
    key resolution lazy (read at first call, not at import time).
    """
    global _embedder
    if _embedder is None:
        from core.embeddings.voyage_embeddings import VoyageEmbedder

        _embedder = VoyageEmbedder(api_key=os.getenv("VOYAGE_API_KEY", ""))
    return _embedder


def get_gateway():
    """Return the process-level LLMGateway singleton.

    LLMGateway.__init__ creates an anthropic.AsyncAnthropic client on every
    call. Sharing one instance across requests avoids that allocation and keeps
    the underlying httpx connection pool alive between requests.
    """
    global _gateway
    if _gateway is None:
        from core.llm.gateway import LLMGateway

        _gateway = LLMGateway(anthropic_key=os.getenv("ANTHROPIC_API_KEY", ""))
    return _gateway
