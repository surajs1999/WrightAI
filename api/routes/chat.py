from __future__ import annotations

import json
import os

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from api.auth import verify_api_key

router = APIRouter(prefix="/chat", tags=["chat"], dependencies=[Depends(verify_api_key)])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    repo_root: str
    conversation_history: list[ChatMessage] = []


@router.post("")
async def chat(request: ChatRequest) -> StreamingResponse:
    """
    Handles chat requests by retrieving relevant code context and streaming AI-generated responses with citations and follow-up questions.

    This endpoint initializes the LLM gateway, embedder, vector store, and hybrid retriever to process user questions about a codebase. It retrieves relevant code contexts using semantic and dependency-based search, maintains conversation history (trimmed to last 20 messages), and streams responses as server-sent events including tokens, file citations, and suggested follow-up questions.

    Args:
        request (ChatRequest): The chat request containing the user's question, repository root path, and conversation history.

    Returns:
        StreamingResponse: A streaming HTTP response that emits server-sent events with types 'token' (text chunks), 'citations' (referenced files), 'followups' (suggested questions), and a final '[DONE]' message.

    Example:
        ```
        response = await chat(ChatRequest(question='How does authentication work?', repo_root='/path/to/repo', conversation_history=[]))
        ```
    """
    from core.llm.gateway import LLMGateway

    gateway = LLMGateway(anthropic_key=os.getenv("ANTHROPIC_API_KEY", ""))
    history = [{"role": m.role, "content": m.content} for m in request.conversation_history]

    # Retrieval is best-effort — if embeddings are unavailable (no Voyage/OpenAI
    # key, or repo not yet indexed) we fall back to empty context and Claude
    # answers from the question alone.
    contexts = []
    try:
        from core.embeddings.chroma_store import ChromaStore
        from core.embeddings.voyage_embeddings import VoyageEmbedder
        from core.parser.dep_graph import DependencyGraph
        from core.retrieval.hybrid_retriever import HybridRetriever

        embedder = VoyageEmbedder(api_key=os.getenv("VOYAGE_API_KEY", ""))
        chroma_path = os.getenv("CHROMA_PATH", os.path.join(request.repo_root, ".wright", "chroma"))
        chroma = ChromaStore(persist_path=chroma_path, repo_root=request.repo_root)
        dep_graph = DependencyGraph()
        retriever = HybridRetriever(chroma, dep_graph, embedder)
        contexts = retriever.retrieve_for_query(request.question, n=5)
    except Exception:
        pass  # no embeddings available — Claude answers without code context

    # Trim history to last 20 messages to stay within context limits
    if len(history) > 20:
        history = history[-20:]

    async def event_stream():
        async for kind, payload in gateway.chat_stream(request.question, contexts, history):
            if kind == "token":
                yield f"data: {json.dumps({'type': 'token', 'content': payload})}\n\n"
            elif kind == "citations":
                yield f"data: {json.dumps({'type': 'citations', 'files': payload})}\n\n"
            elif kind == "followups":
                yield f"data: {json.dumps({'type': 'followups', 'questions': payload})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
