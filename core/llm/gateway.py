from __future__ import annotations

import asyncio
import json
from typing import Any

import anthropic

from core.llm.prompts import (
    DocStyle,
    build_chat_prompt,
    build_docstring_prompt,
    build_drift_check_prompt,
    build_readme_prompt,
    build_module_doc_prompt,
)
from core.llm.schema import DocstringSchema
from core.parser.tree_sitter_parser import ParsedFile, ParsedFunction
from core.retrieval.hybrid_retriever import RetrievedContext

_DOCSTRING_SYSTEM = (
    "You are a precise technical documentation generator. "
    "You MUST return ONLY valid JSON matching the requested schema. "
    "No markdown fences, no extra text, no explanations outside the JSON object."
)

_CHAT_SYSTEM = (
    "You are an expert code assistant helping developers understand their codebase. "
    "Answer questions using the provided code context. "
    "If the context contains relevant code, cite file:line references inline. "
    "If the question is general (e.g. 'what does this project do?'), infer the answer from the code structure and files you can see — do NOT ask the user to provide more files. "
    "Keep answers concise and direct. Never say you cannot answer due to missing context; always give your best answer from what is available."
)


class LLMGateway:
    PRIMARY_MODEL = "claude-sonnet-4-6"
    DRIFT_MODEL = "claude-haiku-4-5-20251001"  # drift check is simple true/false JSON — no need for Sonnet
    FALLBACK_MODEL = "gpt-4o"

    def __init__(self, anthropic_key: str, openai_key: str | None = None) -> None:
        self._anthropic = anthropic.AsyncAnthropic(api_key=anthropic_key)
        self._openai_key = openai_key
        self._openai: Any = None
        if openai_key:
            try:
                import openai

                self._openai = openai.AsyncOpenAI(api_key=openai_key)
            except ImportError:
                pass

    async def generate_docstring(
        self,
        func: ParsedFunction,
        contexts: list[RetrievedContext],
        style: DocStyle,
        verbosity: str = "standard",
        quality: str = "standard",
    ) -> tuple[DocstringSchema, int]:
        """Returns (schema, tokens_used). When quality='high', runs a LangGraph critic/rewriter loop (up to 2 retries); otherwise single-shot. contexts is the list returned by retrieve_for_function."""
        if quality == "high":
            from core.llm.graph import run_doc_gen_graph
            doc, tokens = await run_doc_gen_graph(self, func, contexts, style, verbosity)
            return doc, tokens
        prompt = build_docstring_prompt(func, contexts, style, func.language, verbosity)
        response_text, tokens = await self._call_claude_tracked(prompt, _DOCSTRING_SYSTEM)
        return self._parse_structured_output(response_text), tokens

    async def generate_readme(self, parsed_files: list[ParsedFile], repo_name: str) -> str:
        prompt = build_readme_prompt(parsed_files, repo_name)
        return await self._call_claude(
            prompt, "You are a technical writer. Return only Markdown content."
        )

    async def generate_module_doc(self, parsed_file: ParsedFile) -> str:
        prompt = build_module_doc_prompt(parsed_file, parsed_file.functions)
        return await self._call_claude(
            prompt, "You are a technical writer. Return only the docstring text."
        )

    async def chat_stream(
        self,
        question: str,
        contexts: list[RetrievedContext],
        history: list[dict[str, str]] | None = None,
    ):
        """Yield raw text chunks from Claude, then yield citations as a final sentinel."""
        context_prompt = build_chat_prompt(question, contexts)

        messages: list[dict[str, str]] = []
        for msg in history or []:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": context_prompt})

        cited_paths = list({ctx.chunk.file_path for ctx in contexts})

        answer_chunks: list[str] = []
        async with self._anthropic.messages.stream(
            model=self.PRIMARY_MODEL,
            max_tokens=2048,
            system=_CHAT_SYSTEM,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                answer_chunks.append(text)
                yield ("token", text)

        yield ("citations", cited_paths)

        followups = await self._generate_followups(question, "".join(answer_chunks))
        yield ("followups", followups)

    async def _generate_followups(self, question: str, answer: str) -> list[str]:
        prompt = (
            f"The user asked: {question}\n\n"
            f"The assistant answered: {answer[:600]}\n\n"
            "Generate exactly 3 short follow-up questions the user might ask next. "
            "Return ONLY a JSON array of 3 strings, no markdown, no extra text."
        )
        try:
            response = await self._anthropic.messages.create(
                model=self.PRIMARY_MODEL,
                max_tokens=200,
                system="You generate concise follow-up question suggestions. Return only a JSON array.",
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text.strip()
            start, end = text.find("["), text.rfind("]") + 1
            if start >= 0 and end > start:
                import json as _json

                return _json.loads(text[start:end])[:3]
        except Exception:
            pass
        return []

    async def chat(
        self,
        question: str,
        contexts: list[RetrievedContext],
        history: list[dict[str, str]] | None = None,
    ) -> tuple[str, list[str]]:
        context_prompt = build_chat_prompt(question, contexts)

        messages: list[dict[str, str]] = []
        for msg in history or []:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": context_prompt})

        response = await self._anthropic.messages.create(
            model=self.PRIMARY_MODEL,
            max_tokens=2048,
            system=_CHAT_SYSTEM,
            messages=messages,
        )
        answer = response.content[0].text
        cited_paths = list({ctx.chunk.file_path for ctx in contexts})
        return answer, cited_paths

    async def check_drift(self, func: ParsedFunction, old_docstring: str) -> tuple[bool, str, int]:
        prompt = build_drift_check_prompt(func, old_docstring)
        response_text, tokens = await self._call_claude_tracked(prompt, _DOCSTRING_SYSTEM, model=self.DRIFT_MODEL)
        try:
            data = json.loads(response_text.strip())
            is_drifted = bool(data.get("is_drifted", False))
            reason = data.get("reason") or ""
            return is_drifted, reason, tokens
        except (json.JSONDecodeError, KeyError):
            return False, "Could not parse drift check response", tokens

    async def _call_claude_tracked(self, prompt: str, system: str, model: str | None = None) -> tuple[str, int]:
        """Like _call_claude but also returns the real input+output token count from Anthropic."""
        messages: list[dict[str, str]] = [{"role": "user", "content": prompt}]
        for attempt in range(5):
            try:
                response = await self._anthropic.messages.create(
                    model=model or self.PRIMARY_MODEL,
                    max_tokens=2048,
                    system=system,
                    messages=messages,
                )
                tokens = response.usage.input_tokens + response.usage.output_tokens
                return response.content[0].text, tokens
            except anthropic.RateLimitError:
                if attempt == 4:
                    raise
                await asyncio.sleep(2**attempt)
            except anthropic.APIStatusError as e:
                if e.status_code == 529:
                    if attempt == 4:
                        raise RuntimeError("Anthropic API overloaded after retries") from e
                    await asyncio.sleep(2**attempt)
                else:
                    raise RuntimeError(f"Anthropic API error: {e}") from e
        raise RuntimeError("Exhausted retries calling Anthropic API")

    async def _call_claude(self, prompt: str, system: str, retry_context: str | None = None, model: str | None = None) -> str:
        messages: list[dict[str, str]] = [{"role": "user", "content": prompt}]
        if retry_context:
            messages.append({"role": "assistant", "content": retry_context})
            messages.append(
                {
                    "role": "user",
                    "content": "The previous response was not valid JSON. Return ONLY the JSON object.",
                }
            )

        # Retry with exponential backoff on rate-limit (429) and overloaded (529) errors
        for attempt in range(5):
            try:
                response = await self._anthropic.messages.create(
                    model=model or self.PRIMARY_MODEL,
                    max_tokens=2048,
                    system=system,
                    messages=messages,
                )
                return response.content[0].text
            except anthropic.RateLimitError:
                if attempt == 4:
                    if self._openai:
                        return await self._call_openai_fallback(prompt, system)
                    raise
                await asyncio.sleep(2**attempt)
            except anthropic.APIStatusError as e:
                # 529 = Anthropic API overloaded — transient, worth retrying
                if e.status_code == 529:
                    if attempt == 4:
                        if self._openai:
                            return await self._call_openai_fallback(prompt, system)
                        raise RuntimeError("Anthropic API overloaded after retries") from e
                    await asyncio.sleep(2**attempt)
                else:
                    if self._openai:
                        return await self._call_openai_fallback(prompt, system)
                    raise RuntimeError(f"Anthropic API error: {e}") from e
        raise RuntimeError("Exhausted retries calling Anthropic API")

    async def _call_openai_fallback(self, prompt: str, system: str) -> str:
        if not self._openai:
            raise RuntimeError("No fallback LLM configured")
        response = await self._openai.chat.completions.create(
            model=self.FALLBACK_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            max_tokens=2048,
        )
        return response.choices[0].message.content or ""

    def _parse_structured_output(self, response: str) -> DocstringSchema:
        text = response.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        try:
            return DocstringSchema.model_validate_json(text)
        except Exception:
            # Try to find JSON in the response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    return DocstringSchema.model_validate_json(text[start:end])
                except Exception:
                    pass
            # Return a minimal valid schema
            return DocstringSchema(
                summary=text[:200] if text else "No documentation generated.",
                description=None,
            )
