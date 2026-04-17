from __future__ import annotations

import json
import os
from pathlib import Path

from core.parser.tree_sitter_parser import ParsedFile, ParsedFunction


class MarkdownWriter:
    def write_api_reference(self, parsed_file: ParsedFile, output_dir: str) -> str:
        os.makedirs(output_dir, exist_ok=True)
        rel_path = os.path.basename(parsed_file.path)
        out_path = os.path.join(output_dir, rel_path.replace(".", "_") + ".md")

        lines: list[str] = []
        lines.append(f"# {rel_path}\n")
        lines.append(f"**Language:** {parsed_file.language}  ")
        lines.append(f"**Path:** `{parsed_file.path}`\n")

        if parsed_file.functions:
            lines.append("## Functions\n")
            for func in parsed_file.functions:
                self._write_function_section(func, lines)

        if parsed_file.classes:
            lines.append("## Classes\n")
            for cls in parsed_file.classes:
                lines.append(f"### `{cls.name}`\n")
                if cls.docstring:
                    lines.append(f"{cls.docstring}\n")
                if cls.methods:
                    lines.append("**Methods:**\n")
                    for method in cls.methods:
                        self._write_function_section(method, lines, level=4)

        content = "\n".join(lines)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)
        return out_path

    def _write_function_section(
        self, func: ParsedFunction, lines: list[str], level: int = 3
    ) -> None:
        hashes = "#" * level
        async_prefix = "async " if func.is_async else ""
        params_str = ", ".join(p["name"] for p in func.parameters)
        lines.append(f"\n{hashes} `{async_prefix}{func.name}({params_str})`\n")
        lines.append(f"*File: `{func.file_path}:{func.start_line + 1}`*\n")
        if func.existing_docstring:
            lines.append(f"\n{func.existing_docstring}\n")
        if func.parameters:
            lines.append("\n**Parameters:**\n")
            for param in func.parameters:
                type_str = f": `{param['type_annotation']}`" if param.get("type_annotation") else ""
                lines.append(f"- `{param['name']}`{type_str}")
        if func.return_type:
            lines.append(f"\n**Returns:** `{func.return_type}`\n")

    def write_readme(self, content: str, repo_root: str) -> str:
        out_path = os.path.join(repo_root, "README.md")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)
        return out_path

    def write_module_index(self, parsed_files: list[ParsedFile], output_dir: str) -> str:
        os.makedirs(output_dir, exist_ok=True)
        out_path = os.path.join(output_dir, "index.md")

        lines = ["# Module Index\n"]
        by_language: dict[str, list[ParsedFile]] = {}
        for pf in parsed_files:
            by_language.setdefault(pf.language, []).append(pf)

        for lang, files in sorted(by_language.items()):
            lines.append(f"## {lang.capitalize()}\n")
            for pf in sorted(files, key=lambda x: x.path):
                rel = pf.path
                lines.append(f"- [{os.path.basename(pf.path)}]({os.path.basename(pf.path).replace('.', '_')}.md)")
                lines.append(f"  - Functions: {len(pf.functions)}, Classes: {len(pf.classes)}")
            lines.append("")

        content = "\n".join(lines)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)
        return out_path

    def write_docusaurus_sidebar(self, output_dir: str) -> None:
        sidebar: dict = {"docs": []}
        for filename in os.listdir(output_dir):
            if filename.endswith(".md") and filename != "index.md":
                sidebar["docs"].append(filename[:-3])

        sidebar_path = os.path.join(output_dir, "sidebar.json")
        with open(sidebar_path, "w", encoding="utf-8") as f:
            json.dump(sidebar, f, indent=2)
