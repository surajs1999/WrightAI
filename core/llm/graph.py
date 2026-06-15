from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

from core.llm.prompts import DocStyle, build_docstring_prompt, build_drift_check_prompt
from core.llm.schema import DocstringSchema
from core.parser.tree_sitter_parser import ParsedFunction
from core.retrieval.hybrid_retriever import RetrievedContext

if TYPE_CHECKING:
    from core.llm.gateway import LLMGateway


class DocGenState(TypedDict):
    func: ParsedFunction
    contexts: list[RetrievedContext]
    style: DocStyle
    verbosity: str
    doc: DocstringSchema | None
    critique: str | None
    attempts: int
    tokens_used: int
    model: str
    is_fallback: bool
    retry_count: int
    duration_ms: int
    cache_read_tokens: int


def _render_docstring_text(doc: DocstringSchema) -> str:
    """Render schema to plain text so the critic can evaluate it."""
    parts = [doc.summary]
    if doc.description:
        parts.append(doc.description)
    if doc.parameters:
        parts.append(
            "Parameters: "
            + ", ".join(
                f"{p.name} ({p.type_hint or 'unknown'}): {p.description}" for p in doc.parameters
            )
        )
    if doc.returns:
        parts.append(f"Returns ({doc.returns.type_hint or 'unknown'}): {doc.returns.description}")
    if doc.raises:
        parts.append("Raises: " + ", ".join(f"{r.exception}: {r.condition}" for r in doc.raises))
    if doc.side_effects:
        parts.append(f"Side effects: {doc.side_effects}")
    if doc.notes:
        parts.append(f"Notes: {doc.notes}")
    return "\n".join(parts)


def _merge_call_stats(state: DocGenState, result: Any) -> dict:
    """Accumulate analytics from an LLMResult into the running graph state."""
    return {
        "tokens_used": state.get("tokens_used", 0) + result.tokens,
        "model": result.model,
        "is_fallback": state.get("is_fallback", False) or result.is_fallback,
        "retry_count": state.get("retry_count", 0) + result.retry_count,
        "duration_ms": state.get("duration_ms", 0) + result.duration_ms,
        "cache_read_tokens": state.get("cache_read_tokens", 0) + result.cache_read_tokens,
    }


def _make_generate_node(gateway: LLMGateway) -> Any:
    async def generate_node(state: DocGenState) -> dict:
        prompt = build_docstring_prompt(
            state["func"],
            state["contexts"],
            state["style"],
            state["func"].language,
            state["verbosity"],
        )
        # Append critique correction on rewrites
        if state.get("critique"):
            prompt += (
                f"\n\nPrevious attempt was rejected for this reason: {state['critique']}\n"
                "Fix the above issue and regenerate the JSON."
            )
        from core.llm.gateway import _DOCSTRING_SYSTEM

        _result = await gateway._call_claude_tracked(prompt, _DOCSTRING_SYSTEM)
        doc = gateway._parse_structured_output(_result.text)
        return {"doc": doc, **_merge_call_stats(state, _result)}

    return generate_node


def _make_critic_node(gateway: LLMGateway) -> Any:
    async def critic_node(state: DocGenState) -> dict:
        doc = state["doc"]
        if doc is None:
            return {"critique": "No document was generated."}
        doc_text = _render_docstring_text(doc)
        prompt = build_drift_check_prompt(state["func"], doc_text)
        _result = await gateway._call_claude_tracked(
            prompt,
            "You are a precise documentation quality checker. "
            "Return ONLY valid JSON with keys is_drifted (bool) and reason (str or null).",
        )
        critique: str | None = None
        try:
            data = json.loads(_result.text.strip())
            if data.get("is_drifted"):
                critique = (
                    data.get("reason") or "Documentation does not accurately describe the function."
                )
        except (json.JSONDecodeError, KeyError):
            pass
        return {"critique": critique, **_merge_call_stats(state, _result)}

    return critic_node


def _should_rewrite(state: DocGenState) -> str:
    if state.get("critique") and state.get("attempts", 0) < 2:
        return "rewrite"
    return END


def _increment_attempts(state: DocGenState) -> dict:
    return {"attempts": state.get("attempts", 0) + 1, "critique": state.get("critique")}


def build_doc_gen_graph(gateway: LLMGateway) -> Any:
    generate_node = _make_generate_node(gateway)
    critic_node = _make_critic_node(gateway)

    graph = StateGraph(DocGenState)
    graph.add_node("generate", generate_node)
    graph.add_node("critic", critic_node)
    graph.add_node("increment", _increment_attempts)

    graph.set_entry_point("generate")
    graph.add_edge("generate", "critic")
    graph.add_conditional_edges("critic", _should_rewrite, {"rewrite": "increment", END: END})
    graph.add_edge("increment", "generate")

    return graph.compile()


async def run_doc_gen_graph(
    gateway: LLMGateway,
    func: ParsedFunction,
    contexts: list[RetrievedContext],
    style: DocStyle,
    verbosity: str,
) -> tuple[DocstringSchema, dict]:
    chain = build_doc_gen_graph(gateway)
    initial: DocGenState = {
        "func": func,
        "contexts": contexts,
        "style": style,
        "verbosity": verbosity,
        "doc": None,
        "critique": None,
        "attempts": 0,
        "tokens_used": 0,
        "model": gateway.PRIMARY_MODEL,
        "is_fallback": False,
        "retry_count": 0,
        "duration_ms": 0,
        "cache_read_tokens": 0,
    }
    final_state = await chain.ainvoke(initial)
    doc = final_state.get("doc") or DocstringSchema(summary="No documentation generated.")
    stats = {
        "tokens_used": final_state.get("tokens_used", 0),
        "model": final_state.get("model", gateway.PRIMARY_MODEL),
        "is_fallback": final_state.get("is_fallback", False),
        "retry_count": final_state.get("retry_count", 0),
        "duration_ms": final_state.get("duration_ms", 0),
        "cache_read_tokens": final_state.get("cache_read_tokens", 0),
    }
    return doc, stats
