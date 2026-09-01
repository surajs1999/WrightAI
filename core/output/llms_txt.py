from __future__ import annotations

import os
from datetime import datetime, timezone

from core.parser.tree_sitter_parser import ParsedClass, ParsedFile, ParsedFunction


class LLMSTxtWriter:
    def generate(
        self,
        repo_root: str,
        parsed_files: list[ParsedFile],
        repo_name: str,
    ) -> str:
        from core.config import load_config
        from core.parser.dep_graph import DependencyGraph
        from core.parser.tree_sitter_parser import CodeParser

        function_count = sum(
            len(pf.functions) + sum(len(cls.methods) for cls in pf.classes) for pf in parsed_files
        )

        dep_graph = DependencyGraph()
        dep_graph.build(parsed_files)
        top_functions = dep_graph.get_top_functions(15)

        excluded = sorted(CodeParser._DEFAULT_EXCLUDE | set(load_config(repo_root).exclude))

        sections = [
            _render_header(repo_name, len(parsed_files), function_count),
            _render_key_functions(top_functions, repo_root),
            _render_do_not_modify(excluded),
        ]
        for pf in sorted(parsed_files, key=lambda f: f.path):
            if pf.functions or pf.classes:
                sections.append(_render_file(pf, repo_root))

        return "\n\n".join(sections) + "\n"

    def write(self, content: str, repo_root: str) -> None:
        out_path = os.path.join(repo_root, "llms.txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)


def _render_header(repo_name: str, file_count: int, function_count: int) -> str:
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return (
        f"# {repo_name}\n\n"
        f"> Auto-generated llms.txt for {repo_name}. Complete, deterministic index "
        f"of every function and class — safe for AI coding agents to rely on.\n"
        f"> Generated: {generated}  |  {file_count} files  |  {function_count} functions"
    )


def _render_key_functions(top_functions: list[tuple[str, float]], repo_root: str) -> str:
    if not top_functions:
        return "## Key functions\n\n(none)"
    lines = []
    for node_id, score in top_functions:
        file_path, sep, name = node_id.rpartition("::")
        label = f"{os.path.relpath(file_path, repo_root)}::{name}" if sep else node_id
        lines.append(f"- `{label}` (score: {score:.4f})")
    return "## Key functions\n\n" + "\n".join(lines)


def _render_do_not_modify(excluded: list[str]) -> str:
    lines = "\n".join(f"- {name}" for name in excluded)
    return f"## Do not modify\n\n{lines}"


def _render_file(pf: ParsedFile, repo_root: str) -> str:
    parts = [f"## {os.path.relpath(pf.path, repo_root)}"]
    for func in pf.functions:
        parts.append(_render_function(func))
    for cls in pf.classes:
        parts.append(_render_class(cls))
    return "\n\n".join(parts)


def _render_class(cls: ParsedClass) -> str:
    parts = [f"### class `{cls.name}`"]
    summary = _summary(cls.docstring)
    if summary:
        parts.append(summary)
    for method in cls.methods:
        parts.append(_render_function(method, indent="  "))
    return "\n\n".join(parts)


def _render_function(func: ParsedFunction, indent: str = "") -> str:
    lines = [f"{indent}### `{_format_signature(func)}`  *(line {func.start_line + 1})*"]
    for decorator in func.decorators:
        lines.append(f"{indent}{decorator}")
    lines.append(f"{indent}{_summary(func.existing_docstring)}")
    return "\n".join(lines)


def _format_signature(func: ParsedFunction) -> str:
    params = ", ".join(_format_param(p) for p in func.parameters)
    signature = f"{func.name}({params})"
    if func.return_type:
        signature += f" -> {func.return_type}"
    if func.is_async:
        signature = f"async {signature}"
    return signature


def _format_param(param: dict) -> str:
    name = param.get("name", "")
    type_annotation = param.get("type_annotation")
    return f"{name}: {type_annotation}" if type_annotation else name


def _summary(docstring: str | None) -> str:
    if not docstring:
        return "*Undocumented*"
    for line in docstring.strip().splitlines():
        line = line.strip()
        if line:
            return line if len(line) <= 160 else line[:157] + "..."
    return "*Undocumented*"
