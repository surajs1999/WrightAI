from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Literal

from core.parser.cache import ASTCache
from core.parser.tree_sitter_parser import CodeParser, ParsedFunction


@dataclass
class DriftResult:
    function_name: str
    file_path: str
    status: Literal["drifted", "undocumented", "up_to_date"]
    reason: str | None
    old_signature: str | None
    new_signature: str | None


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


class DriftDetector:
    def __init__(self) -> None:
        self._parser = CodeParser()

    def check_file(self, file_path: str, cache: ASTCache) -> list[DriftResult]:
        cached = cache.get(file_path)
        current_parsed = self._parser.parse_file(file_path)
        cache.set(current_parsed)

        results: list[DriftResult] = []
        current_funcs = {f.name: f for f in current_parsed.functions if f.name != "<anonymous>"}

        if cached is None:
            # No prior baseline — treat existing docstrings as up-to-date.
            # Only flag truly undocumented functions.
            for func in current_parsed.functions:
                if func.name == "<anonymous>":
                    continue
                status = "undocumented" if func.existing_docstring is None else "up_to_date"
                results.append(
                    DriftResult(
                        function_name=func.name,
                        file_path=file_path,
                        status=status,
                        reason=None,
                        old_signature=None,
                        new_signature=_signature_str(func),
                    )
                )
            return results

        cached_funcs = {f.name: f for f in cached.functions}

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
                                        results.append(DriftResult(
                                            function_name=func.name,
                                            file_path=file_path,
                                            status="undocumented",
                                            reason="Modified file has undocumented function",
                                            old_signature=None,
                                            new_signature=_signature_str(func),
                                        ))
                                    else:
                                        results.append(DriftResult(
                                            function_name=func.name,
                                            file_path=file_path,
                                            status="up_to_date",
                                            reason=None,
                                            old_signature=None,
                                            new_signature=_signature_str(func),
                                        ))
                        except Exception:
                            pass
            return results
        except Exception as e:
            raise RuntimeError(f"Git diff failed: {e}") from e

    def _signature_changed(self, old_func: ParsedFunction, new_func: ParsedFunction) -> bool:
        # Only flag parameter changes — return type and async changes are minor
        # and don't require docstring rewrites.
        old_params = [p["name"] for p in old_func.parameters]
        new_params = [p["name"] for p in new_func.parameters]
        return old_params != new_params

    _SKIP_PARAMS = {"self", "cls", "args", "kwargs"}

    def _docstring_covers_params(self, func: ParsedFunction) -> bool:
        meaningful = [
            p for p in func.parameters
            if p["name"] not in self._SKIP_PARAMS
            and not p["name"].startswith("*")
        ]
        if not meaningful:
            return True
        doc = func.existing_docstring or ""
        for param in meaningful:
            name = param["name"]
            if not re.search(r"\b" + re.escape(name) + r"\b", doc):
                return False
        return True
