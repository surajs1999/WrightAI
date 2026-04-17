from __future__ import annotations

import os
from typing import TYPE_CHECKING

from core.parser.tree_sitter_parser import ParsedFile

if TYPE_CHECKING:
    from core.llm.gateway import LLMGateway


class LLMSTxtWriter:
    async def generate(
        self,
        repo_root: str,
        parsed_files: list[ParsedFile],
        repo_name: str,
        gateway: "LLMGateway",
    ) -> str:
        from core.parser.dep_graph import DependencyGraph
        from core.llm.prompts import build_llms_txt_prompt

        dep_graph = DependencyGraph()
        dep_graph.build(parsed_files)
        top_functions = dep_graph.get_top_functions(10)

        prompt = build_llms_txt_prompt(repo_name, parsed_files, top_functions)
        content = await gateway._call_claude(
            prompt,
            "You are a technical writer. Return only the llms.txt content.",
        )
        return content

    def write(self, content: str, repo_root: str) -> None:
        out_path = os.path.join(repo_root, "llms.txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)
