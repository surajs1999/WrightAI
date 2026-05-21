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
