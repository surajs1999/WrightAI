from __future__ import annotations

import json
import os
from typing import Any

import anthropic

from core.llm.prompts import DocStyle, build_chat_prompt, build_docstring_prompt, build_drift_check_prompt, build_readme_prompt, build_module_doc_prompt
from core.llm.schema import DocstringSchema
from core.parser.tree_sitter_parser import ParsedFile, ParsedFunction
from core.retrieval.hybrid_retriever import RetrievedContext

_DOCSTRING_SYSTEM = (
    "You are a precise technical documentation generator. "
    "You MUST return ONLY valid JSON matching the requested schema. "
    "No markdown fences, no extra text, no explanations outside the JSON object."
)

_CHAT_SYSTEM = (
    "You are an expert code assistant. Answer questions about the codebase concisely. "
    "Always cite file:line references when referencing specific code."
)


class LLMGateway:
    PRIMARY_MODEL = "claude-sonnet-4-5"
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
        context: RetrievedContext,
        style: DocStyle,
    ) -> DocstringSchema:
        prompt = build_docstring_prompt(func, context, style, func.language)
        response_text = await self._call_claude(prompt, _DOCSTRING_SYSTEM)
        return self._parse_structured_output(response_text)

    async def generate_readme(self, parsed_files: list[ParsedFile], repo_name: str) -> str:
        from core.llm.prompts import build_readme_prompt
        prompt = build_readme_prompt(parsed_files, repo_name)
        return await self._call_claude(prompt, "You are a technical writer. Return only Markdown content.")

    async def generate_module_doc(self, parsed_file: ParsedFile) -> str:
        prompt = build_module_doc_prompt(parsed_file, parsed_file.functions)
        return await self._call_claude(prompt, "You are a technical writer. Return only the docstring text.")

    async def chat(
        self,
        question: str,
        contexts: list[RetrievedContext],
    ) -> tuple[str, list[str]]:
        prompt = build_chat_prompt(question, contexts)
        answer = await self._call_claude(prompt, _CHAT_SYSTEM)
        cited_paths = list({ctx.chunk.file_path for ctx in contexts})
        return answer, cited_paths

    async def check_drift(self, func: ParsedFunction, old_docstring: str) -> tuple[bool, str]:
        prompt = build_drift_check_prompt(func, old_docstring)
        response_text = await self._call_claude(prompt, _DOCSTRING_SYSTEM)
        try:
            data = json.loads(response_text.strip())
            is_drifted = bool(data.get("is_drifted", False))
            reason = data.get("reason") or ""
            return is_drifted, reason
        except (json.JSONDecodeError, KeyError):
            return False, "Could not parse drift check response"

    async def _call_claude(self, prompt: str, system: str, retry_context: str | None = None) -> str:
        messages: list[dict[str, str]] = [{"role": "user", "content": prompt}]
        if retry_context:
            messages.append({"role": "assistant", "content": retry_context})
            messages.append({"role": "user", "content": "The previous response was not valid JSON. Return ONLY the JSON object."})

        try:
            response = await self._anthropic.messages.create(
                model=self.PRIMARY_MODEL,
                max_tokens=2048,
                system=system,
                messages=messages,
            )
            return response.content[0].text
        except anthropic.APIError as e:
            if self._openai:
                return await self._call_openai_fallback(prompt, system)
            raise RuntimeError(f"Anthropic API error: {e}") from e

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
        except Exception as first_error:
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
