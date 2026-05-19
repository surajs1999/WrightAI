"""Tests for chat (gateway + API route) and MCP search_docs."""

from __future__ import annotations

import json
from typing import AsyncIterator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from core.parser.ast_chunker import CodeChunk
from core.parser.tree_sitter_parser import ParsedFunction
from core.retrieval.hybrid_retriever import RetrievedContext


# ─── Shared fixtures ──────────────────────────────────────────────────────────


def _make_chunk(name: str = "my_func", file_path: str = "src/mod.py", line: int = 10) -> CodeChunk:
    return CodeChunk(
        chunk_id=f"{file_path}::{name}",
        file_path=file_path,
        language="python",
        chunk_type="function",
        name=name,
        source=f"def {name}(x):\n    return x",
        start_line=line,
        end_line=line + 2,
        token_count=12,
    )


def _make_func(name: str = "my_func", file_path: str = "src/mod.py") -> ParsedFunction:
    return ParsedFunction(
        name=name,
        language="python",
        file_path=file_path,
        start_byte=0,
        end_byte=40,
        start_line=10,
        end_line=12,
        source=f"def {name}(x):\n    return x",
        existing_docstring="Does something.",
        parameters=[],
        return_type=None,
        is_async=False,
        decorators=[],
    )


def _make_context(name: str = "my_func") -> RetrievedContext:
    return RetrievedContext(
        function=_make_func(name),
        chunk=_make_chunk(name),
        callers=[],
        callees=[],
        vector_score=0.9,
        graph_score=0.05,
        combined_score=0.56,
        total_tokens=12,
    )


# ─── build_chat_prompt ────────────────────────────────────────────────────────


def test_build_chat_prompt_with_contexts() -> None:
    from core.llm.prompts import build_chat_prompt

    ctx = _make_context()
    prompt = build_chat_prompt("How does my_func work?", [ctx])

    assert "How does my_func work?" in prompt
    assert "src/mod.py" in prompt
    assert "def my_func" in prompt


def test_build_chat_prompt_empty_contexts() -> None:
    from core.llm.prompts import build_chat_prompt

    prompt = build_chat_prompt("What does this project do?", [])

    assert "What does this project do?" in prompt
    assert "no code chunks indexed yet" in prompt


# ─── LLMGateway.chat() ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_gateway_chat_returns_answer_and_citations() -> None:
    from core.llm.gateway import LLMGateway

    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="This function adds two numbers.")]

    gateway = LLMGateway.__new__(LLMGateway)
    gateway._anthropic = MagicMock()
    gateway._anthropic.messages.create = AsyncMock(return_value=mock_response)

    ctx = _make_context()
    answer, citations = await gateway.chat("What does my_func do?", [ctx])

    assert answer == "This function adds two numbers."
    assert "src/mod.py" in citations


@pytest.mark.asyncio
async def test_gateway_chat_empty_contexts_still_works() -> None:
    from core.llm.gateway import LLMGateway

    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="I don't have enough context.")]

    gateway = LLMGateway.__new__(LLMGateway)
    gateway._anthropic = MagicMock()
    gateway._anthropic.messages.create = AsyncMock(return_value=mock_response)

    answer, citations = await gateway.chat("Explain the codebase.", [])

    assert len(answer) > 0
    assert citations == []


@pytest.mark.asyncio
async def test_gateway_chat_passes_history() -> None:
    from core.llm.gateway import LLMGateway

    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="Follow-up answer.")]

    gateway = LLMGateway.__new__(LLMGateway)
    gateway._anthropic = MagicMock()
    gateway._anthropic.messages.create = AsyncMock(return_value=mock_response)

    history = [
        {"role": "user", "content": "First question"},
        {"role": "assistant", "content": "First answer"},
    ]
    answer, _ = await gateway.chat("Second question", [], history=history)

    call_kwargs = gateway._anthropic.messages.create.call_args.kwargs
    messages = call_kwargs["messages"]
    # history + current question = 3 messages
    assert len(messages) == 3
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"


# ─── LLMGateway.chat_stream() ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_gateway_chat_stream_yields_tokens_then_citations() -> None:
    from core.llm.gateway import LLMGateway

    async def _fake_text_stream() -> AsyncIterator[str]:
        for word in ["Hello", " ", "world"]:
            yield word

    mock_stream_cm = MagicMock()
    mock_stream_cm.__aenter__ = AsyncMock(return_value=mock_stream_cm)
    mock_stream_cm.__aexit__ = AsyncMock(return_value=False)
    mock_stream_cm.text_stream = _fake_text_stream()

    followup_response = MagicMock()
    followup_response.content = [MagicMock(text='["Q1?", "Q2?", "Q3?"]')]

    gateway = LLMGateway.__new__(LLMGateway)
    gateway._anthropic = MagicMock()
    gateway._anthropic.messages.stream = MagicMock(return_value=mock_stream_cm)
    gateway._anthropic.messages.create = AsyncMock(return_value=followup_response)

    ctx = _make_context()
    events = []
    async for kind, payload in gateway.chat_stream("What is this?", [ctx]):
        events.append((kind, payload))

    token_events = [(k, p) for k, p in events if k == "token"]
    citation_events = [(k, p) for k, p in events if k == "citations"]
    followup_events = [(k, p) for k, p in events if k == "followups"]

    assert token_events == [("token", "Hello"), ("token", " "), ("token", "world")]
    assert len(citation_events) == 1
    assert "src/mod.py" in citation_events[0][1]
    assert len(followup_events) == 1
    assert len(followup_events[0][1]) == 3


@pytest.mark.asyncio
async def test_gateway_generate_followups_parses_json() -> None:
    from core.llm.gateway import LLMGateway

    mock_response = MagicMock()
    mock_response.content = [
        MagicMock(text='["How does X work?", "What about Y?", "Can I use Z?"]')
    ]

    gateway = LLMGateway.__new__(LLMGateway)
    gateway._anthropic = MagicMock()
    gateway._anthropic.messages.create = AsyncMock(return_value=mock_response)

    result = await gateway._generate_followups("question", "answer")

    assert result == ["How does X work?", "What about Y?", "Can I use Z?"]


@pytest.mark.asyncio
async def test_gateway_generate_followups_returns_empty_on_bad_json() -> None:
    from core.llm.gateway import LLMGateway

    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="not json at all")]

    gateway = LLMGateway.__new__(LLMGateway)
    gateway._anthropic = MagicMock()
    gateway._anthropic.messages.create = AsyncMock(return_value=mock_response)

    result = await gateway._generate_followups("q", "a")
    assert result == []


# ─── API /chat route ──────────────────────────────────────────────────────────


def test_api_chat_streams_sse_events() -> None:
    from fastapi.testclient import TestClient

    from api.auth import _WRIGHT_API_KEY
    from api.main import app

    async def _fake_stream(question, contexts, history=None):
        yield ("token", "Hello")
        yield ("token", " world")
        yield ("citations", ["src/mod.py"])
        yield ("followups", ["What next?"])

    # Imports inside the route function are lazy — patch at the source modules.
    with (
        patch("core.llm.gateway.LLMGateway") as MockGateway,
        patch("core.embeddings.voyage_embeddings.VoyageEmbedder"),
        patch("core.embeddings.chroma_store.ChromaStore"),
        patch("core.parser.dep_graph.DependencyGraph"),
        patch("core.retrieval.hybrid_retriever.HybridRetriever") as MockRetriever,
    ):
        instance = MockGateway.return_value
        instance.chat_stream = _fake_stream

        MockRetriever.return_value.retrieve_for_query.return_value = []

        client = TestClient(app)
        resp = client.post(
            "/chat",
            json={"question": "What does this do?", "repo_root": "/tmp"},
            headers={"X-Wright-API-Key": _WRIGHT_API_KEY},
        )

    assert resp.status_code == 200
    body = resp.text
    assert '"type": "token"' in body
    assert "Hello" in body
    assert '"type": "citations"' in body
    assert '"type": "followups"' in body
    assert "[DONE]" in body


def test_api_chat_rejects_missing_auth() -> None:
    from fastapi.testclient import TestClient

    from api.main import app

    client = TestClient(app)
    resp = client.post(
        "/chat",
        json={"question": "hi", "repo_root": "/tmp"},
    )
    assert resp.status_code == 401


# ─── MCP _search_docs ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_mcp_search_docs_returns_list(tmp_path) -> None:
    from mcp_server.server import _search_docs

    mock_result = MagicMock()
    mock_result.chunk_id = "abc"
    mock_result.file_path = str(tmp_path / "mod.py")
    mock_result.language = "python"
    mock_result.chunk_type = "function"
    mock_result.name = "my_func"
    mock_result.source = "def my_func(): pass"
    mock_result.start_line = 1
    mock_result.end_line = 2
    mock_result.distance = 0.1

    # _search_docs uses lazy imports — patch at the source modules.
    with (
        patch("core.embeddings.voyage_embeddings.VoyageEmbedder") as MockEmbed,
        patch("core.embeddings.chroma_store.ChromaStore") as MockChroma,
        patch("core.parser.dep_graph.DependencyGraph"),
        patch("core.retrieval.hybrid_retriever.HybridRetriever") as MockRetriever,
    ):
        MockEmbed.return_value.embed_query.return_value = [0.1] * 1024
        MockChroma.return_value = MagicMock()

        ctx = _make_context("my_func")
        ctx.chunk.file_path = str(tmp_path / "mod.py")
        MockRetriever.return_value.retrieve_for_query.return_value = [ctx]

        result = await _search_docs({"query": "my function", "repo_root": str(tmp_path), "n": 3})

    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0]["function_name"] == "my_func"
    assert "file_path" in result[0]
    assert "score" in result[0]


@pytest.mark.asyncio
async def test_mcp_search_docs_empty_when_no_results(tmp_path) -> None:
    from mcp_server.server import _search_docs

    with (
        patch("core.embeddings.voyage_embeddings.VoyageEmbedder"),
        patch("core.embeddings.chroma_store.ChromaStore"),
        patch("core.parser.dep_graph.DependencyGraph"),
        patch("core.retrieval.hybrid_retriever.HybridRetriever") as MockRetriever,
    ):
        MockRetriever.return_value.retrieve_for_query.return_value = []

        result = await _search_docs({"query": "nothing", "repo_root": str(tmp_path)})

    assert result == []


@pytest.mark.asyncio
async def test_mcp_call_tool_search_docs_error_handled() -> None:
    """call_tool should return error dict, not raise, when search_docs fails."""
    from mcp_server.server import call_tool

    # MCP CallToolRequest has nested structure — build manually without spec.
    request = MagicMock()
    request.params.name = "search_docs"
    request.params.arguments = {"query": "x", "repo_root": "/nonexistent"}

    with patch("mcp_server.server._search_docs", side_effect=RuntimeError("boom")):
        result = await call_tool(request)

    text = result.content[0].text
    data = json.loads(text)
    assert "error" in data
    assert "boom" in data["error"]


@pytest.mark.asyncio
async def test_mcp_call_tool_unknown_tool_returns_error() -> None:
    from mcp_server.server import call_tool

    request = MagicMock()
    request.params.name = "nonexistent_tool"
    request.params.arguments = {}

    result = await call_tool(request)
    data = json.loads(result.content[0].text)
    assert "error" in data
    assert "Unknown tool" in data["error"]
