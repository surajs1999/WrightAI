from __future__ import annotations

import asyncio
import hashlib
import json
import re
import time
from dataclasses import dataclass
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

_FOLLOWUP_SYSTEM = "You generate concise follow-up question suggestions. Return only a JSON array."


@dataclass
class LLMResult:
    """Carries text + full analytics from a single LLM call — returned by _call_claude_tracked."""

    text: str
    tokens: int
    model: str
    is_fallback: bool = False
    retry_count: int = 0
    duration_ms: int = 0
    cache_read_tokens: int = 0


class LLMGateway:
    PRIMARY_MODEL = "claude-sonnet-4-6"
    DRIFT_MODEL = (
        "claude-haiku-4-5-20251001"  # drift check is simple true/false JSON — no need for Sonnet
    )
    FALLBACK_MODEL = "gemini-2.5-pro"
    DRIFT_FALLBACK_MODEL = "gemini-2.5-flash"

    # Gemini min-token thresholds for CachedContent eligibility
    _GEMINI_CACHE_MIN = {
        "gemini-2.5-pro": 32_768,
        "gemini-2.0-flash": 4_096,
    }

    def __init__(self, anthropic_key: str, gemini_key: str | None = None) -> None:
        self._anthropic = anthropic.AsyncAnthropic(api_key=anthropic_key)
        self._gemini_key = gemini_key
        self._gemini_client: Any = None
        # Per-instance cache: maps "{model}::{system_hash}" → cache name string
        self._gemini_cache: dict[str, str] = {}
        if gemini_key:
            try:
                from google import genai as _genai

                self._gemini_client = _genai.Client(api_key=gemini_key)
            except ImportError:
                self._gemini_key = None

    # ── Public API ────────────────────────────────────────────────────────────

    async def generate_docstring(
        self,
        func: ParsedFunction,
        contexts: list[RetrievedContext],
        style: DocStyle,
        verbosity: str = "standard",
        quality: str = "standard",
    ) -> tuple[DocstringSchema, LLMResult]:
        """Returns (schema, LLMResult). When quality='high', runs a LangGraph critic/rewriter loop (up to 2 retries)."""
        if quality == "high":
            from core.llm.graph import run_doc_gen_graph

            doc, stats = await run_doc_gen_graph(self, func, contexts, style, verbosity)
            return doc, LLMResult(
                text="",
                tokens=stats["tokens_used"],
                model=stats["model"],
                is_fallback=stats["is_fallback"],
                retry_count=stats["retry_count"],
                duration_ms=stats["duration_ms"],
                cache_read_tokens=stats["cache_read_tokens"],
            )
        prompt = build_docstring_prompt(func, contexts, style, func.language, verbosity)
        result = await self._call_claude_tracked(prompt, _DOCSTRING_SYSTEM)
        return self._parse_structured_output(result.text), result

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
        """Yield raw text chunks from Claude (or Gemini), then yield citations/followups."""
        context_prompt = build_chat_prompt(question, contexts)

        history_list = list(history or [])
        messages: list[dict[str, Any]] = []
        for i, msg in enumerate(history_list):
            # Cache the last history turn so the entire prior conversation is reused
            if i == len(history_list) - 1:
                content: Any = [
                    {"type": "text", "text": msg["content"], "cache_control": {"type": "ephemeral"}}
                ]
            else:
                content = msg["content"]
            messages.append({"role": msg["role"], "content": content})
        messages.append(
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": context_prompt, "cache_control": {"type": "ephemeral"}}
                ],
            }
        )

        cited_paths = list({ctx.chunk.file_path for ctx in contexts})

        answer_chunks: list[str] = []
        total_tokens = 0
        model_used = self.PRIMARY_MODEL
        try:
            async with self._anthropic.messages.stream(
                model=self.PRIMARY_MODEL,
                max_tokens=2048,
                system=[
                    {"type": "text", "text": _CHAT_SYSTEM, "cache_control": {"type": "ephemeral"}}
                ],
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    answer_chunks.append(text)
                    yield ("token", text)
                try:
                    final = await stream.get_final_message()
                    total_tokens = final.usage.input_tokens + final.usage.output_tokens
                except Exception:
                    pass
        except Exception:
            if getattr(self, "_gemini_key", None):
                # Pass the full message list so Gemini preserves conversation history
                full_text, fb_tokens = await self._call_gemini_fallback(
                    context_prompt, _CHAT_SYSTEM, messages=messages
                )
                answer_chunks = [full_text]
                total_tokens = fb_tokens
                model_used = self.FALLBACK_MODEL
                yield ("token", full_text)
            else:
                raise

        yield ("citations", cited_paths)

        followups = await self._generate_followups(question, "".join(answer_chunks))
        yield ("followups", followups)

        # Yield model name so chat route can record which provider actually served the response
        yield ("model", model_used)
        yield ("usage", total_tokens)

    async def chat(
        self,
        question: str,
        contexts: list[RetrievedContext],
        history: list[dict[str, str]] | None = None,
    ) -> tuple[str, list[str]]:
        context_prompt = build_chat_prompt(question, contexts)

        history_list = list(history or [])
        messages: list[dict[str, Any]] = []
        for i, msg in enumerate(history_list):
            if i == len(history_list) - 1:
                content: Any = [
                    {"type": "text", "text": msg["content"], "cache_control": {"type": "ephemeral"}}
                ]
            else:
                content = msg["content"]
            messages.append({"role": msg["role"], "content": content})
        messages.append(
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": context_prompt, "cache_control": {"type": "ephemeral"}}
                ],
            }
        )

        try:
            response = await self._anthropic.messages.create(
                model=self.PRIMARY_MODEL,
                max_tokens=2048,
                system=[
                    {"type": "text", "text": _CHAT_SYSTEM, "cache_control": {"type": "ephemeral"}}
                ],
                messages=messages,
            )
            answer = response.content[0].text
        except Exception:
            if getattr(self, "_gemini_key", None):
                # Pass the full message list so Gemini preserves conversation history
                answer, _fb_tokens = await self._call_gemini_fallback(
                    context_prompt, _CHAT_SYSTEM, messages=messages
                )
            else:
                raise

        cited_paths = list({ctx.chunk.file_path for ctx in contexts})
        return answer, cited_paths

    async def check_drift(
        self, func: ParsedFunction, old_docstring: str, imports: list[str] | None = None
    ) -> tuple[bool, str, LLMResult]:
        prompt = build_drift_check_prompt(func, old_docstring, imports)
        result = await self._call_claude_tracked(prompt, _DOCSTRING_SYSTEM, model=self.DRIFT_MODEL)
        try:
            data = json.loads(result.text.strip())
            is_drifted = bool(data.get("is_drifted", False))
            reason = data.get("reason") or ""
            return is_drifted, reason, result
        except (json.JSONDecodeError, KeyError):
            return False, "Could not parse drift check response", result

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _generate_followups(self, question: str, answer: str) -> list[str]:
        prompt = (
            f"The user asked: {question}\n\n"
            f"The assistant answered: {answer[:600]}\n\n"
            "Generate exactly 3 short follow-up questions the user might ask next. "
            "Return ONLY a JSON array of 3 strings, no markdown, no extra text."
        )
        raw_text: str | None = None
        try:
            response = await self._anthropic.messages.create(
                model=self.PRIMARY_MODEL,
                max_tokens=200,
                system=[
                    {
                        "type": "text",
                        "text": _FOLLOWUP_SYSTEM,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[{"role": "user", "content": prompt}],
            )
            raw_text = response.content[0].text.strip()
        except Exception:
            if getattr(self, "_gemini_key", None):
                try:
                    raw_text, _fb_tokens = await self._call_gemini_fallback(
                        prompt, _FOLLOWUP_SYSTEM, json_mode=True
                    )
                except Exception:
                    pass

        if raw_text:
            start, end = raw_text.find("["), raw_text.rfind("]") + 1
            if start >= 0 and end > start:
                try:
                    import json as _json

                    return _json.loads(raw_text[start:end])[:3]
                except Exception:
                    pass
        return []

    async def _call_claude_tracked(
        self, prompt: str, system: str, model: str | None = None
    ) -> LLMResult:
        """Returns LLMResult with text, tokens, model, is_fallback, retry_count, duration_ms, cache_read_tokens."""
        actual_model = model or self.PRIMARY_MODEL
        cached_system = [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}]
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt, "cache_control": {"type": "ephemeral"}}
                ],
            }
        ]
        t0 = time.monotonic()
        for attempt in range(5):
            try:
                response = await self._anthropic.messages.create(
                    model=actual_model,
                    max_tokens=2048,
                    system=cached_system,
                    messages=messages,
                )
                duration_ms = int((time.monotonic() - t0) * 1000)
                usage = response.usage
                cache_read_tokens = getattr(usage, "cache_read_input_tokens", 0)
                tokens = (
                    usage.input_tokens
                    + usage.output_tokens
                    + getattr(usage, "cache_creation_input_tokens", 0)
                    + cache_read_tokens
                )
                return LLMResult(
                    text=response.content[0].text,
                    tokens=tokens,
                    model=actual_model,
                    is_fallback=False,
                    retry_count=attempt,
                    duration_ms=duration_ms,
                    cache_read_tokens=cache_read_tokens,
                )
            except anthropic.RateLimitError:
                if attempt == 4:
                    if getattr(self, "_gemini_key", None):
                        fallback = self._tracked_fallback_model(model)
                        t_fb = time.monotonic()
                        text, tokens = await self._call_gemini_tracked(prompt, system, fallback)
                        return LLMResult(
                            text=text,
                            tokens=tokens,
                            model=fallback,
                            is_fallback=True,
                            retry_count=attempt,
                            duration_ms=int((time.monotonic() - t_fb) * 1000),
                        )
                    raise
                await asyncio.sleep(2**attempt)
            except anthropic.APIStatusError as e:
                if e.status_code == 529:
                    if attempt == 4:
                        if getattr(self, "_gemini_key", None):
                            fallback = self._tracked_fallback_model(model)
                            t_fb = time.monotonic()
                            text, tokens = await self._call_gemini_tracked(prompt, system, fallback)
                            return LLMResult(
                                text=text,
                                tokens=tokens,
                                model=fallback,
                                is_fallback=True,
                                retry_count=attempt,
                                duration_ms=int((time.monotonic() - t_fb) * 1000),
                            )
                        raise RuntimeError("Anthropic API overloaded after retries") from e
                    await asyncio.sleep(2**attempt)
                else:
                    if getattr(self, "_gemini_key", None):
                        fallback = self._tracked_fallback_model(model)
                        t_fb = time.monotonic()
                        text, tokens = await self._call_gemini_tracked(prompt, system, fallback)
                        return LLMResult(
                            text=text,
                            tokens=tokens,
                            model=fallback,
                            is_fallback=True,
                            retry_count=attempt,
                            duration_ms=int((time.monotonic() - t_fb) * 1000),
                        )
                    raise RuntimeError(f"Anthropic API error: {e}") from e
        raise RuntimeError("Exhausted retries calling Anthropic API")

    async def _call_gemini_tracked(self, prompt: str, system: str, model: str) -> tuple[str, int]:
        """Call Gemini and return (text, actual_token_count) using usage_metadata."""
        text, tokens = await self._call_gemini_fallback(prompt, system, json_mode=True, model=model)
        return text, tokens

    def _tracked_fallback_model(self, model: str | None) -> str:
        """Pick the right Gemini tier based on which Claude tier was originally requested."""
        return (
            self.DRIFT_FALLBACK_MODEL if (model or "") == self.DRIFT_MODEL else self.FALLBACK_MODEL
        )

    async def _call_claude(
        self, prompt: str, system: str, retry_context: str | None = None, model: str | None = None
    ) -> str:
        cached_system = [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}]
        messages: list[dict[str, Any]] = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt, "cache_control": {"type": "ephemeral"}}
                ],
            }
        ]
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
                    system=cached_system,
                    messages=messages,
                )
                return response.content[0].text
            except anthropic.RateLimitError:
                if attempt == 4:
                    if getattr(self, "_gemini_key", None):
                        text, _tok = await self._call_gemini_fallback(prompt, system)
                        return text
                    raise
                await asyncio.sleep(2**attempt)
            except anthropic.APIStatusError as e:
                # 529 = Anthropic API overloaded — transient, worth retrying
                if e.status_code == 529:
                    if attempt == 4:
                        if getattr(self, "_gemini_key", None):
                            text, _tok = await self._call_gemini_fallback(prompt, system)
                            return text
                        raise RuntimeError("Anthropic API overloaded after retries") from e
                    await asyncio.sleep(2**attempt)
                else:
                    if getattr(self, "_gemini_key", None):
                        text, _tok = await self._call_gemini_fallback(prompt, system)
                        return text
                    raise RuntimeError(f"Anthropic API error: {e}") from e
        raise RuntimeError("Exhausted retries calling Anthropic API")

    async def _call_gemini_fallback(
        self,
        prompt: str,
        system: str,
        json_mode: bool = False,
        model: str | None = None,
        messages: list[dict[str, Any]] | None = None,
    ) -> tuple[str, int]:
        """
        Call Gemini as the LLM fallback. Returns (text, token_count).

        Caching strategy: attempt server-side CachedContent for the system instruction
        (TTL = 5 min). Gemini requires a minimum token count per model tier; when content
        is too small the cache create call raises and we fall through to a direct call.

        Multi-turn history: when `messages` is provided, the list is converted from
        Anthropic format to Gemini Contents format so conversation history is preserved.
        """
        if not self._gemini_client:
            raise RuntimeError("No fallback LLM configured")
        try:
            from google.genai import types as _gtypes

            client: Any = self._gemini_client
            model_name = model or self.FALLBACK_MODEL

            base_config: dict[str, Any] = {"max_output_tokens": 8192}
            if json_mode:
                base_config["response_mime_type"] = "application/json"

            # ── Attempt server-side caching for the system instruction ────────
            cache_key = f"{model_name}::{hashlib.md5(system.encode()).hexdigest()[:12]}"
            cached_name: str | None = self._gemini_cache.get(cache_key)

            if cached_name is not None:
                try:
                    # Verify the cache entry still exists (may have expired)
                    client.caches.get(name=cached_name)
                except Exception:
                    self._gemini_cache.pop(cache_key, None)
                    cached_name = None

            if cached_name is None:
                try:
                    cache = client.caches.create(
                        model=model_name,
                        config=_gtypes.CreateCachedContentConfig(
                            system_instruction=system,
                            ttl="300s",
                        ),
                    )
                    cached_name = cache.name
                    self._gemini_cache[cache_key] = cached_name
                except Exception:
                    pass  # below min-token threshold — use plain call with system_instruction

            # Build generate config
            cfg_kwargs: dict[str, Any] = dict(base_config)
            if cached_name:
                cfg_kwargs["cached_content"] = cached_name
            else:
                cfg_kwargs["system_instruction"] = system
            gen_config = _gtypes.GenerateContentConfig(**cfg_kwargs)

            # ── Build contents (single-shot or multi-turn) ────────────────────
            if messages and len(messages) > 1:
                # Convert Anthropic message list → Gemini Contents list
                contents: list[Any] = []
                for msg in messages[:-1]:
                    role = "model" if msg["role"] == "assistant" else "user"
                    raw = msg["content"]
                    if isinstance(raw, list):
                        text_part = " ".join(
                            b["text"]
                            for b in raw
                            if isinstance(b, dict) and b.get("type") == "text"
                        )
                    else:
                        text_part = str(raw)
                    contents.append(
                        _gtypes.Content(role=role, parts=[_gtypes.Part.from_text(text=text_part)])
                    )
                contents.append(
                    _gtypes.Content(role="user", parts=[_gtypes.Part.from_text(text=prompt)])
                )
            else:
                contents = prompt

            response = await client.aio.models.generate_content(
                model=model_name,
                contents=contents,
                config=gen_config,
            )

            # Extract actual token count from usage_metadata
            try:
                meta = response.usage_metadata
                tokens = (meta.prompt_token_count or 0) + (meta.candidates_token_count or 0)
            except Exception:
                tokens = (len(prompt) + len(system) + len(response.text)) // 4
            return response.text, tokens
        except Exception as e:
            raise RuntimeError(f"Gemini API error: {e}") from e

    # ── Output parsing ────────────────────────────────────────────────────────

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

            # Response is JSON-like but unparseable (e.g. truncated mid-object
            # because max_output_tokens was hit). Pull out a complete "summary"
            # field if present, rather than injecting raw/partial JSON as the
            # docstring text.
            if start >= 0:
                match = re.search(r'"summary"\s*:\s*"((?:[^"\\]|\\.)*)"', text[start:])
                if match:
                    try:
                        summary = json.loads(f'"{match.group(1)}"')
                    except Exception:
                        summary = match.group(1)
                    return DocstringSchema(summary=summary, description=None)
                return DocstringSchema(
                    summary="Documentation generation produced an incomplete response.",
                    description=None,
                )

            # Return a minimal valid schema
            return DocstringSchema(
                summary=text[:200] if text else "No documentation generated.",
                description=None,
            )
