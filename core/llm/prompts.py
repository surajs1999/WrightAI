from __future__ import annotations

import json
from enum import Enum

from core.parser.tree_sitter_parser import ParsedFile, ParsedFunction
from core.retrieval.hybrid_retriever import RetrievedContext


class DocStyle(str, Enum):
    JSDOC = "jsdoc"
    GOOGLE = "google"
    NUMPY = "numpy"
    EPYTEXT = "epytext"
    RUST = "rust"


def _format_context_snippet(contexts: list[RetrievedContext]) -> str:
    snippets = []
    for ctx in contexts:
        callers_str = ", ".join(f"{f} ({p})" for p, f in ctx.callers[:3])
        callees_str = ", ".join(f"{f} ({p})" for p, f in ctx.callees[:3])
        snippet = f"File: {ctx.chunk.file_path}:{ctx.chunk.start_line}\n```\n{ctx.chunk.source[:800]}\n```"
        if callers_str:
            snippet += f"\nCallers: {callers_str}"
        if callees_str:
            snippet += f"\nCallees: {callees_str}"
        snippets.append(snippet)
    return "\n\n---\n\n".join(snippets)


def build_docstring_prompt(
    func: ParsedFunction,
    context: RetrievedContext,
    style: DocStyle,
    language: str,
) -> str:
    style_guide = {
        DocStyle.GOOGLE: "Use Google-style docstrings with Args:, Returns:, Raises: sections.",
        DocStyle.NUMPY: "Use NumPy-style docstrings with Parameters, Returns, Raises sections and dashes.",
        DocStyle.JSDOC: "Use JSDoc format with @param, @returns, @throws tags.",
        DocStyle.EPYTEXT: "Use Epytext format with @param, @type, @return, @raise tags.",
        DocStyle.RUST: "Use Rust doc comment format with # Arguments, # Returns sections.",
    }

    param_list = "\n".join(
        f"  - {p['name']}: {p.get('type_annotation', 'unknown')}"
        for p in func.parameters
    )

    callers = ", ".join(f"{f}()" for _, f in context.callers[:5]) or "none"
    callees = ", ".join(f"{f}()" for _, f in context.callees[:5]) or "none"

    schema_example = json.dumps({
        "summary": "One-sentence description of what the function does.",
        "description": "Optional longer explanation, or null.",
        "parameters": [{"name": "param_name", "type_hint": "str", "description": "What this param does."}],
        "returns": {"type_hint": "bool", "description": "What is returned."},
        "raises": [{"exception": "ValueError", "condition": "When the input is invalid."}],
        "example": "result = my_func(arg1, arg2)",
        "complexity": "O(n) time, O(1) space",
    }, indent=2)

    return f"""You are an expert technical writer generating documentation for {language} code.

{style_guide.get(style, style_guide[DocStyle.GOOGLE])}

Function to document:
```{language}
{func.source}
```

Parameters:
{param_list or "  (none)"}

Return type: {func.return_type or "unknown"}
Is async: {func.is_async}
Decorators: {", ".join(func.decorators) or "none"}
Called by: {callers}
Calls: {callees}

Relevant context from the codebase:
{_format_context_snippet([context])}

Return ONLY a JSON object matching this exact schema (no markdown fences, no extra text):
{schema_example}

Rules:
- summary must be one sentence, present tense, starting with a verb
- description is null if summary is sufficient
- If there are no parameters, returns, raises — use empty arrays/null
- example should show realistic usage with real values
- complexity is null unless the function has non-trivial algorithmic complexity
"""


def build_readme_prompt(parsed_files: list[ParsedFile], repo_name: str) -> str:
    file_summary = "\n".join(
        f"- {pf.path}: {len(pf.functions)} functions, {len(pf.classes)} classes, language={pf.language}"
        for pf in parsed_files[:30]
    )
    return f"""You are a technical writer creating a README.md for the repository "{repo_name}".

Repository structure:
{file_summary}

Write a comprehensive README.md with these sections:
1. # {repo_name} — one-line description
2. ## Overview — what this project does (2-3 sentences)
3. ## Installation — pip/npm install commands
4. ## Quick Start — 5 steps from zero to working
5. ## Architecture — how the main components fit together
6. ## Contributing — brief contribution guide

Use proper Markdown. Be concise and accurate based on the files provided.
Return only the Markdown content, no extra commentary.
"""


def build_module_doc_prompt(parsed_file: ParsedFile, functions: list[ParsedFunction]) -> str:
    func_names = "\n".join(f"- {f.name}({', '.join(p['name'] for p in f.parameters)})" for f in functions[:20])
    return f"""Write a module-level documentation comment for this {parsed_file.language} file: {parsed_file.path}

Functions defined in this module:
{func_names}

Imports: {", ".join(parsed_file.imports[:10])}

Write a concise module docstring (2-4 sentences) explaining:
1. What this module does
2. Its main responsibilities
3. How it fits in the larger system

Return only the docstring text (no quotes, no extra formatting).
"""


def build_openapi_prompt(func: ParsedFunction, route_info: dict) -> str:
    return f"""Generate OpenAPI 3.0 documentation for this API endpoint.

Route info: {json.dumps(route_info, indent=2)}

Handler function:
```python
{func.source}
```

Return a JSON object with keys: summary, description, parameters (list), requestBody (or null), responses (dict of status_code -> description).
"""


def build_llms_txt_prompt(
    repo_name: str,
    parsed_files: list[ParsedFile],
    top_functions: list[tuple[str, float]],
) -> str:
    file_list = "\n".join(f"- {pf.path} ({pf.language})" for pf in parsed_files[:20])
    top_funcs = "\n".join(f"- {node_id} (score: {score:.4f})" for node_id, score in top_functions[:10])
    return f"""Generate an llms.txt file for the repository "{repo_name}".

Files in repo:
{file_list}

Top functions by PageRank:
{top_funcs}

Write the llms.txt content following this exact format:
# {repo_name}

## Overview
(2-3 sentence summary)

## Architecture
(key modules and their roles, bullet list)

## Entry points
(main files/functions to start reading)

## Key functions
(top 10 with one-line descriptions)

## Do not modify
(list of generated/vendored directories)

Return only the llms.txt content.
"""


def build_chat_prompt(question: str, retrieved_contexts: list[RetrievedContext]) -> str:
    context_str = _format_context_snippet(retrieved_contexts) if retrieved_contexts else "(no code chunks indexed yet)"
    return f"""Answer the following question about this codebase.

Question: {question}

Code context retrieved from the repo:
{context_str}

Rules:
- Answer directly and concisely using the context above
- Cite sources as [filename:line] inline when referencing specific code
- For general questions ("what does this do?", "what features exist?"), infer the answer from the file names, function names, and code structure visible in the context
- Use code blocks for code examples
- Never ask the user to provide more files — always give your best answer from what is available
"""


def build_drift_check_prompt(func: ParsedFunction, old_docstring: str) -> str:
    return f"""Determine if the existing documentation is still accurate for this function.

Current function code:
```{func.language}
{func.source}
```

Existing documentation:
{old_docstring}

Check if the documentation is:
1. Accurate for the current parameters (names and types match)
2. Accurate for the return type
3. Mentions all important raises/exceptions
4. Still reflects what the function does

Return a JSON object:
{{"is_drifted": true/false, "reason": "explanation of why it drifted, or null if up to date"}}

Return only the JSON, no extra text.
"""
