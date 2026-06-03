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

        response_text, tokens = await gateway._call_claude_tracked(prompt, _DOCSTRING_SYSTEM)
        doc = gateway._parse_structured_output(response_text)
        return {
            "doc": doc,
            "tokens_used": state.get("tokens_used", 0) + tokens,
        }

    return generate_node


def _make_critic_node(gateway: LLMGateway) -> Any:
    async def critic_node(state: DocGenState) -> dict:
        doc = state["doc"]
        if doc is None:
            return {
                "critique": "No document was generated.",
                "tokens_used": state.get("tokens_used", 0),
            }
        doc_text = _render_docstring_text(doc)
        prompt = build_drift_check_prompt(state["func"], doc_text)
        response_text, tokens = await gateway._call_claude_tracked(
            prompt,
            "You are a precise documentation quality checker. "
            "Return ONLY valid JSON with keys is_drifted (bool) and reason (str or null).",
        )
        critique: str | None = None
        try:
            data = json.loads(response_text.strip())
            if data.get("is_drifted"):
                critique = (
                    data.get("reason") or "Documentation does not accurately describe the function."
                )
        except (json.JSONDecodeError, KeyError):
            pass
        return {
            "critique": critique,
            "tokens_used": state.get("tokens_used", 0) + tokens,
        }

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
) -> tuple[DocstringSchema, int]:
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
    }
    final_state = await chain.ainvoke(initial)
    doc = final_state.get("doc") or DocstringSchema(summary="No documentation generated.")
    return doc, final_state.get("tokens_used", 0)
