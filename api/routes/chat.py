from __future__ import annotations

import asyncio
import json
import os

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from api.auth import verify_api_key
from api.quota import check_quota

router = APIRouter(prefix="/chat", tags=["chat"], dependencies=[Depends(verify_api_key)])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    repo_root: str
    conversation_history: list[ChatMessage] = []


@router.post("")
async def chat(request: ChatRequest, http_request: Request) -> StreamingResponse:
    """
    Handles an incoming chat POST request by retrieving relevant code context via hybrid retrieval and streaming AI-generated responses back to the client as server-sent events.

    This async endpoint initializes the LLM gateway (using Anthropic), a VoyageEmbedder, a ChromaStore vector store, and a HybridRetriever to fetch up to 5 semantically and dependency-relevant code contexts for the user's question. Conversation history is trimmed to the last 20 messages to stay within context limits. The response is streamed as server-sent events, emitting 'token' events for incremental text, 'citations' events for referenced source files, 'followups' events for suggested follow-up questions, and a terminal '[DONE]' sentinel. If embeddings or the vector store are unavailable (e.g., missing API keys or unindexed repository), retrieval is skipped gracefully and the LLM answers from the question alone.

    Args:
        request (ChatRequest): The chat request object containing the user's question, the repository root path used to locate the Chroma vector store, and the prior conversation history as a list of role/content message pairs.

    Returns:
        StreamingResponse: A Starlette StreamingResponse with media type 'text/event-stream' that emits JSON-encoded server-sent events of types 'token' (incremental LLM text), 'citations' (referenced source files), and 'followups' (suggested follow-up questions), terminated by a '[DONE]' message.

    Example:
        ```
        response = await chat(ChatRequest(question='How does authentication work?', repo_root='/path/to/repo', conversation_history=[]))
        ```
    """
    from api.embedder import get_gateway
    from api.routes.repos import ensure_repo_local
    from api.usage_store import record_event

    api_key = http_request.headers.get("X-Wright-API-Key", "")

    # Gate: chat_messages_per_month == 0 on free → 403; >0 enforces monthly cap
    quota = check_quota(api_key, "chat_message", raise_on_blocked=True)
    await ensure_repo_local(request.repo_root)
    gateway = get_gateway()
    history = [{"role": m.role, "content": m.content} for m in request.conversation_history]

    # Retrieval is best-effort — if embeddings are unavailable (no Voyage/OpenAI
    # key, or repo not yet indexed) we fall back to empty context and Claude
    # answers from the question alone.
    contexts = []
    try:
        from api.chroma_cache import get as get_chroma
        from api.embedder import get_embedder
        from api.routes.repos import get_vector_store
        from core.parser.dep_graph import DependencyGraph
        from core.retrieval.hybrid_retriever import HybridRetriever

        embedder = get_embedder()
        chroma_path = os.getenv("CHROMA_PATH", os.path.join(request.repo_root, ".wright", "chroma"))
        chroma = get_vector_store(request.repo_root, get_chroma(chroma_path, request.repo_root))
        dep_graph = DependencyGraph()
        retriever = HybridRetriever(chroma, dep_graph, embedder)
        contexts = retriever.retrieve_for_query(request.question, n=5)
    except Exception:
        pass  # no embeddings available — Claude answers without code context

    # Trim history to last 20 messages to stay within context limits
    if len(history) > 20:
        history = history[-20:]

    async def event_stream():
        tokens_used = 0
        from core.llm.gateway import LLMGateway as _LLMGateway

        model_used = _LLMGateway.PRIMARY_MODEL
        try:
            if quota.warning:
                yield f"data: {json.dumps({'type': 'quota_warning', 'used': quota.used, 'limit': quota.limit, 'pct': quota.pct, 'upgrade_url': quota.upgrade_url})}\n\n"
            async for kind, payload in gateway.chat_stream(request.question, contexts, history):
                if kind == "token":
                    yield f"data: {json.dumps({'type': 'token', 'content': payload})}\n\n"
                elif kind == "citations":
                    yield f"data: {json.dumps({'type': 'citations', 'files': payload})}\n\n"
                elif kind == "followups":
                    yield f"data: {json.dumps({'type': 'followups', 'questions': payload})}\n\n"
                elif kind == "model":
                    model_used = payload
                elif kind == "usage":
                    tokens_used = payload
            yield "data: [DONE]\n\n"
        finally:
            # Runs on normal completion AND client disconnect — ensures event is always recorded
            asyncio.create_task(
                asyncio.to_thread(
                    record_event,
                    api_key,
                    "chat_message",
                    tokens=tokens_used,
                    repo_name=os.path.basename(request.repo_root),
                    model=model_used,
                    is_fallback=(model_used != _LLMGateway.PRIMARY_MODEL),
                    conversation_turns=len(history),
                    context_chunks=len(contexts),
                )
            )

    return StreamingResponse(event_stream(), media_type="text/event-stream")
