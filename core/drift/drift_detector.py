from __future__ import annotations

import asyncio
import os
import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

from core.parser.cache import ASTCache
from core.parser.tree_sitter_parser import CodeParser, ParsedFile, ParsedFunction

if TYPE_CHECKING:
    from core.llm.gateway import LLMGateway


@dataclass
class DriftResult:
    function_name: str
    file_path: str
    status: Literal["drifted", "undocumented", "up_to_date"]
    reason: str | None
    old_signature: str | None
    new_signature: str | None
    line: int | None = None
    tokens: int = 0


def _signature_str(func: ParsedFunction) -> str:
    """
    Generates a human-readable string representation of a function signature from a ParsedFunction object.

    Constructs a formatted Python function signature string by joining parameter name-type pairs, conditionally prepending an 'async ' prefix for asynchronous functions, and appending the return type annotation when present. The resulting string follows standard Python signature syntax and is used by check_file() and check_git_diff() for drift detection reporting.

    Args:
        func (ParsedFunction): A parsed function object containing metadata including the function name, list of parameters (each with 'name' and optional 'type_annotation' keys), return type annotation, and async status flag.

    Returns:
        str: A formatted string representing the function signature in the form '[async ]function_name(param1: type1, param2: type2)[ -> return_type]', where the async prefix and return type are conditionally included based on the function's metadata.

    Example:
        ```
        signature = _signature_str(parsed_func)  # Returns 'async fetch_data(url: str, timeout: int) -> dict'
        ```

    Complexity: O(n) time where n is the number of parameters, O(n) space for string concatenation
    """
    params = ", ".join(f"{p['name']}: {p.get('type_annotation', '')}" for p in func.parameters)
    async_prefix = "async " if func.is_async else ""
    ret = f" -> {func.return_type}" if func.return_type else ""
    return f"{async_prefix}{func.name}({params}){ret}"


def _collect_all_funcs(pf: ParsedFile) -> dict[str, ParsedFunction]:
    """Return all named functions and class methods keyed by qualified name (ClassName.method)."""
    result: dict[str, ParsedFunction] = {}
    for f in pf.functions:
        if f.name != "<anonymous>":
            result[f.name] = f
    for cls in pf.classes:
        for m in cls.methods:
            if m.name != "<anonymous>":
                result[f"{cls.name}.{m.name}"] = m
    return result


class DriftDetector:
    def __init__(self) -> None:
        self._parser = CodeParser()

    def check_file(self, file_path: str, cache: ASTCache) -> list[DriftResult]:
        cached = cache.get_baseline(file_path)
        current_parsed = self._parser.parse_file(file_path)

        results: list[DriftResult] = []
        current_funcs = _collect_all_funcs(current_parsed)

        if cached is None:
            # No prior baseline — treat existing docstrings as up-to-date.
            # Only flag truly undocumented functions.
            for func_name, func in current_funcs.items():
                status = "undocumented" if func.existing_docstring is None else "up_to_date"
                results.append(
                    DriftResult(
                        function_name=func_name,
                        file_path=file_path,
                        status=status,
                        reason=None,
                        old_signature=None,
                        new_signature=_signature_str(func),
                    )
                )
            cache.set(current_parsed)
            return results

        cached_funcs = _collect_all_funcs(cached)

        for func_name, current_func in current_funcs.items():
            if func_name not in cached_funcs:
                if current_func.existing_docstring is None:
                    results.append(
                        DriftResult(
                            function_name=func_name,
                            file_path=file_path,
                            status="undocumented",
                            reason="New function with no documentation",
                            old_signature=None,
                            new_signature=_signature_str(current_func),
                        )
                    )
                else:
                    results.append(
                        DriftResult(
                            function_name=func_name,
                            file_path=file_path,
                            status="up_to_date",
                            reason=None,
                            old_signature=None,
                            new_signature=_signature_str(current_func),
                        )
                    )
                continue

            old_func = cached_funcs[func_name]

            if current_func.existing_docstring is None:
                results.append(
                    DriftResult(
                        function_name=func_name,
                        file_path=file_path,
                        status="undocumented",
                        reason=None,
                        old_signature=_signature_str(old_func),
                        new_signature=_signature_str(current_func),
                    )
                )
            elif self._signature_changed(old_func, current_func):
                results.append(
                    DriftResult(
                        function_name=func_name,
                        file_path=file_path,
                        status="drifted",
                        reason="Function signature changed since documentation was written",
                        old_signature=_signature_str(old_func),
                        new_signature=_signature_str(current_func),
                    )
                )
            else:
                results.append(
                    DriftResult(
                        function_name=func_name,
                        file_path=file_path,
                        status="up_to_date",
                        reason=None,
                        old_signature=_signature_str(old_func),
                        new_signature=_signature_str(current_func),
                    )
                )

        # Only advance the baseline when the file is fully clean.
        if not any(r.status == "drifted" for r in results):
            cache.set(current_parsed)

        return results

    def check_directory(self, dir_path: str, cache: ASTCache) -> list[DriftResult]:
        results: list[DriftResult] = []
        for root, dirs, files in os.walk(dir_path):
            dirs[:] = [d for d in dirs if d not in self._parser._DEFAULT_EXCLUDE]
            for filename in files:
                file_path = os.path.join(root, filename)
                lang = self._parser.detect_language(file_path)
                if lang:
                    try:
                        results.extend(self.check_file(file_path, cache))
                    except Exception:
                        pass
        return results

    async def check_file_async(
        self,
        file_path: str,
        cache: ASTCache,
        gateway: LLMGateway,
        sem: asyncio.Semaphore,
    ) -> list[DriftResult]:
        cached = cache.get_baseline(file_path)
        current_parsed = self._parser.parse_file(file_path)
        # NOTE: cache is updated AFTER results, only when nothing is drifted.
        # Updating the cache with stale code would contaminate the baseline and
        # cause Fast path 1 to skip LLM on subsequent saves (source equality fires).

        results: list[DriftResult] = []
        current_funcs = _collect_all_funcs(current_parsed)
        cached_funcs = _collect_all_funcs(cached) if cached else {}

        async def _llm_check(
            func_name: str, func: ParsedFunction, old_sig: str | None
        ) -> DriftResult:
            async with sem:
                is_drifted, reason, _llm_result = await gateway.check_drift(
                    func, func.existing_docstring or ""
                )
            status = "drifted" if is_drifted else "up_to_date"
            # Persist result so the next run with identical source+docstring skips LLM.
            cache.set_function_result(
                file_path,
                func_name,
                func.source,
                func.existing_docstring or "",
                status,
                reason if is_drifted else None,
            )
            return DriftResult(
                function_name=func_name,
                file_path=file_path,
                status=status,
                reason=reason if is_drifted else None,
                old_signature=old_sig,
                new_signature=_signature_str(func),
                line=func.start_line,
                tokens=_llm_result.tokens,
            )

        tasks = []
        for func_name, func in current_funcs.items():
            if func.existing_docstring is None:
                results.append(
                    DriftResult(
                        function_name=func_name,
                        file_path=file_path,
                        status="undocumented",
                        reason="New function with no documentation"
                        if func_name not in cached_funcs
                        else None,
                        old_signature=_signature_str(cached_funcs[func_name])
                        if func_name in cached_funcs
                        else None,
                        new_signature=_signature_str(func),
                        line=func.start_line,
                    )
                )
                continue

            old_func = cached_funcs.get(func_name)
            old_sig = _signature_str(old_func) if old_func else None

            # Fast path 1: signature change is definite drift — no LLM needed
            if old_func and self._signature_changed(old_func, func):
                results.append(
                    DriftResult(
                        function_name=func_name,
                        file_path=file_path,
                        status="drifted",
                        reason="Function signature changed since documentation was written",
                        old_signature=old_sig,
                        new_signature=_signature_str(func),
                        line=func.start_line,
                    )
                )
                continue

            # Fast path 2: source+docstring match last LLM result — return cached status.
            # Covers both up_to_date and drifted functions: no need to re-ask the LLM
            # when nothing has changed since the last check.
            cached_result = cache.get_function_result(
                file_path, func_name, func.source, func.existing_docstring or ""
            )
            if cached_result is not None:
                status, reason = cached_result
                results.append(
                    DriftResult(
                        function_name=func_name,
                        file_path=file_path,
                        status=status,
                        reason=reason,
                        old_signature=old_sig,
                        new_signature=_signature_str(func),
                        line=func.start_line,
                    )
                )
                continue

            tasks.append((func_name, func, old_sig))

        raw = await asyncio.gather(
            *[_llm_check(fn, f, s) for fn, f, s in tasks],
            return_exceptions=True,
        )
        results.extend(r for r in raw if isinstance(r, DriftResult))

        # Only advance the baseline when the file is fully clean.
        # If any function is drifted the old baseline is preserved so the next
        # save still sees a source-code delta and re-runs the LLM check.
        if not any(r.status == "drifted" for r in results):
            cache.set(current_parsed)

        return results

    async def check_directory_async(
        self,
        dir_path: str,
        cache: ASTCache,
        gateway: LLMGateway,
        concurrency: int = 5,
    ) -> list[DriftResult]:
        sem = asyncio.Semaphore(concurrency)
        file_paths = []
        for root, dirs, files in os.walk(dir_path):
            dirs[:] = [d for d in dirs if d not in self._parser._DEFAULT_EXCLUDE]
            for filename in files:
                file_path = os.path.join(root, filename)
                if self._parser.detect_language(file_path):
                    file_paths.append(file_path)

        async def _safe_check(fp: str) -> list[DriftResult]:
            try:
                return await self.check_file_async(fp, cache, gateway, sem)
            except Exception:
                return []

        all_results = await asyncio.gather(*[_safe_check(fp) for fp in file_paths])
        return [r for batch in all_results for r in batch]

    def check_git_diff(self, repo_path: str, base_ref: str = "HEAD~1") -> list[DriftResult]:
        try:
            import git

            repo = git.Repo(repo_path)

            # Shallow clones won't have the base_ref commit — deepen to get enough history
            if repo.git.rev_parse("--is-shallow-repository").strip() == "true":
                depth = int(base_ref.replace("HEAD~", "") or "1") + 1
                try:
                    repo.git.fetch("--depth", str(depth))
                except Exception:
                    raise RuntimeError("Shallow clone — could not deepen to reach base ref")

            diff = repo.head.commit.diff(base_ref)
            cache = None
            try:
                from core.parser.cache import ASTCache
                import os as _os

                cache_path = _os.path.join(repo_path, ".wright", "ast_cache.db")
                cache = ASTCache(cache_path)
            except Exception:
                pass

            results: list[DriftResult] = []
            for diff_item in diff:
                file_path = os.path.join(repo_path, diff_item.a_path)
                if os.path.exists(file_path):
                    lang = self._parser.detect_language(file_path)
                    if lang:
                        try:
                            if cache is not None:
                                results.extend(self.check_file(file_path, cache))
                            else:
                                current = self._parser.parse_file(file_path)
                                for func in current.functions:
                                    if func.name == "<anonymous>":
                                        continue
                                    if func.existing_docstring is None:
                                        results.append(
                                            DriftResult(
                                                function_name=func.name,
                                                file_path=file_path,
                                                status="undocumented",
                                                reason="Modified file has undocumented function",
                                                old_signature=None,
                                                new_signature=_signature_str(func),
                                            )
                                        )
                                    else:
                                        results.append(
                                            DriftResult(
                                                function_name=func.name,
                                                file_path=file_path,
                                                status="up_to_date",
                                                reason=None,
                                                old_signature=None,
                                                new_signature=_signature_str(func),
                                            )
                                        )
                        except Exception:
                            pass
            return results
        except Exception as e:
            raise RuntimeError(f"Git diff failed: {e}") from e

    # Return types that are too vague to signal a meaningful doc change
    _VAGUE_RETURN_TYPES = frozenset({"None", "none", "", "Any", "object"})

    # Decorators that change the function's interface or behaviour in a doc-relevant way
    _MEANINGFUL_DECORATORS = frozenset(
        {
            "property",
            "staticmethod",
            "classmethod",
            "abstractmethod",
            "cached_property",
            "override",
            "final",
        }
    )

    @staticmethod
    def _norm_decorator(d: str) -> str:
        return d.lstrip("@").split("(")[0].strip()

    def _signature_changed(self, old_func: ParsedFunction, new_func: ParsedFunction) -> bool:
        # 1. Parameter names changed (added, removed, or renamed)
        old_params = [p["name"] for p in old_func.parameters]
        new_params = [p["name"] for p in new_func.parameters]
        if old_params != new_params:
            return True

        # 2. Parameter type annotations changed
        old_types = [p.get("type_annotation") or "" for p in old_func.parameters]
        new_types = [p.get("type_annotation") or "" for p in new_func.parameters]
        if old_types != new_types:
            return True

        # 3. Return type changed between two concrete types
        old_ret = (old_func.return_type or "").strip()
        new_ret = (new_func.return_type or "").strip()
        if (
            old_ret != new_ret
            and old_ret not in self._VAGUE_RETURN_TYPES
            and new_ret not in self._VAGUE_RETURN_TYPES
        ):
            return True

        # 4. Async status changed (sync→async changes the calling contract)
        if old_func.is_async != new_func.is_async:
            return True

        # 5. Meaningful decorators changed (e.g. @staticmethod added/removed)
        old_decs = {
            self._norm_decorator(d) for d in (old_func.decorators or [])
        } & self._MEANINGFUL_DECORATORS
        new_decs = {
            self._norm_decorator(d) for d in (new_func.decorators or [])
        } & self._MEANINGFUL_DECORATORS
        if old_decs != new_decs:
            return True

        return False

    _SKIP_PARAMS = {"self", "cls", "args", "kwargs"}

    def _docstring_covers_params(self, func: ParsedFunction) -> bool:
        meaningful = [
            p
            for p in func.parameters
            if p["name"] not in self._SKIP_PARAMS and not p["name"].startswith("*")
        ]
        if not meaningful:
            return True
        doc = func.existing_docstring or ""
        for param in meaningful:
            name = param["name"]
            if not re.search(r"\b" + re.escape(name) + r"\b", doc):
                return False
        return True
