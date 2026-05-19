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
    GO = "go"


# Maps language → its natural doc style when no explicit override is given.
LANGUAGE_DEFAULT_STYLE: dict[str, DocStyle] = {
    "javascript": DocStyle.JSDOC,
    "typescript": DocStyle.JSDOC,
    "java": DocStyle.JSDOC,
    "rust": DocStyle.RUST,
    "go": DocStyle.GO,
    "python": DocStyle.GOOGLE,
}


def _format_context_snippet(contexts: list[RetrievedContext]) -> str:
    """
    Formats a list of retrieved code contexts into a human-readable string with source snippets, file locations, and caller/callee information.

    Creates formatted documentation snippets for each context by combining the source code (truncated to 800 characters), file path with line number, and lists of up to 3 callers and callees. Each snippet is separated by horizontal dividers for readability.

    Args:
        contexts (list[RetrievedContext]): A list of RetrievedContext objects containing code chunks with associated caller and callee metadata to be formatted.

    Returns:
        str: A formatted string containing all context snippets separated by '\n\n---\n\n' delimiters, with each snippet including file location, source code, and optional caller/callee lists.

    Example:
        ```
        formatted_text = _format_context_snippet(retrieved_contexts)
        ```

    Complexity: O(n*m) time where n is the number of contexts and m is the average number of callers/callees (capped at 3), O(n) space
    """
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
    verbosity: str = "standard",
) -> str:
    """
    Builds a prompt string for generating documentation for a parsed function using LLM.

    Constructs a comprehensive prompt that includes function metadata, parameters, context from the codebase, and formatting instructions based on the specified documentation style. The prompt is designed to guide an LLM to generate structured documentation in JSON format.

    Args:
        func (ParsedFunction): The parsed function object containing source code, parameters, return type, decorators, and async status.
        context (RetrievedContext): The retrieved context containing information about callers and callees of the function.
        style (DocStyle): The documentation style enum specifying the format (e.g., GOOGLE, NUMPY, JSDOC).
        language (str): The programming language of the code being documented (e.g., 'python').

    Returns:
        str: A formatted prompt string containing instructions, function details, and JSON schema for LLM-based documentation generation.

    Example:
        ```
        prompt = build_docstring_prompt(parsed_func, context_data, DocStyle.GOOGLE, 'python')
        ```
    """
    style_guide = {
        DocStyle.GOOGLE: "Use Google-style docstrings with Args:, Returns:, Raises: sections.",
        DocStyle.NUMPY: "Use NumPy-style docstrings with Parameters, Returns, Raises sections and dashes.",
        DocStyle.JSDOC: "Use JSDoc format with @param, @returns, @throws tags.",
        DocStyle.EPYTEXT: "Use Epytext format with @param, @type, @return, @raise tags.",
        DocStyle.RUST: "Use Rust doc comment format with # Arguments, # Returns sections.",
        DocStyle.GO: "Use Go doc comment format: plain // line comments before the function. First sentence is the summary.",
    }

    param_list = "\n".join(
        f"  - {p['name']}: {p.get('type_annotation', 'unknown')}" for p in func.parameters
    )

    callers = ", ".join(f"{f}()" for _, f in context.callers[:5]) or "none"
    callees = ", ".join(f"{f}()" for _, f in context.callees[:5]) or "none"

    schema_example = json.dumps(
        {
            "summary": "One-sentence description of what the function does.",
            "description": "Optional longer explanation, or null.",
            "parameters": [
                {"name": "param_name", "type_hint": "str", "description": "What this param does."}
            ],
            "returns": {"type_hint": "bool", "description": "What is returned."},
            "raises": [{"exception": "ValueError", "condition": "When the input is invalid."}],
            "example": "result = my_func(arg1, arg2)",
            "complexity": "O(n) time, O(1) space",
        },
        indent=2,
    )

    verbosity_guide = {
        "concise": "Be brief. One-sentence summary only. Omit description, example, and complexity unless essential.",
        "standard": "Include summary, parameters, returns, and a short example.",
        "detailed": "Be thorough. Include summary, full description, all parameters, returns, raises, example, and complexity.",
    }

    return f"""You are an expert technical writer generating documentation for {language} code.

{style_guide.get(style, style_guide[DocStyle.GOOGLE])}
Verbosity: {verbosity_guide.get(verbosity, verbosity_guide["standard"])}

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
    """
    Builds a prompt string for an LLM to generate a comprehensive README.md file for a repository.

    Constructs a formatted prompt that instructs an LLM to act as a technical writer and create a README.md with specific sections (title, overview, installation, quick start, architecture, and contributing). The prompt includes a summary of the first 30 parsed files showing their paths, function counts, class counts, and programming language.

    Args:
        parsed_files (list[ParsedFile]): List of ParsedFile objects containing analyzed code files with their functions, classes, paths, and language information. Only the first 30 files are included in the prompt summary.
        repo_name (str): Name of the repository for which the README.md is being generated. Used in the title and throughout the prompt.

    Returns:
        str: A formatted prompt string containing instructions for the LLM to generate a README.md, including repository structure summary and required sections.

    Example:
        ```
        prompt = build_readme_prompt(parsed_files, 'my-awesome-project')
        ```

    Complexity: O(n) time where n is min(len(parsed_files), 30), O(n) space for building the file summary string
    """
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
    """
    Builds a prompt string for generating module-level documentation by combining file metadata, function signatures, and imports.

    Constructs a formatted prompt that instructs an LLM to write module-level documentation. The prompt includes up to 20 function signatures with their parameters, up to 10 imports, and specific instructions for creating a concise 2-4 sentence docstring that explains the module's purpose, responsibilities, and role in the larger system.

    Args:
        parsed_file (ParsedFile): The parsed file object containing metadata such as file path, language, and imports for the module being documented.
        functions (list[ParsedFunction]): A list of parsed function objects from the module, each containing name and parameters; limited to first 20 functions in the output.

    Returns:
        str: A formatted prompt string containing instructions and context for generating module-level documentation.

    Example:
        ```
        prompt = build_module_doc_prompt(parsed_file, [func1, func2, func3])
        ```

    Complexity: O(n + m) time where n is the number of functions (up to 20) and m is the number of parameters per function, O(1) space for the output string
    """
    func_names = "\n".join(
        f"- {f.name}({', '.join(p['name'] for p in f.parameters)})" for f in functions[:20]
    )
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
    """
    Builds a prompt string for generating OpenAPI 3.0 documentation for an API endpoint.

    Constructs a formatted prompt that includes route information and the handler function's source code, instructing an LLM to generate OpenAPI documentation with specific fields including summary, description, parameters, request body, and responses.

    Args:
        func (ParsedFunction): A parsed function object containing the source code and metadata of the API handler function to document.
        route_info (dict): A dictionary containing route information such as HTTP method, path, and other endpoint details that will be serialized to JSON in the prompt.

    Returns:
        str: A formatted prompt string containing instructions, route information, and function source code for OpenAPI documentation generation.

    Example:
        ```
        prompt = build_openapi_prompt(parsed_func, {'method': 'GET', 'path': '/users/{id}'})
        ```

    Complexity: O(n) time where n is the size of route_info dict for JSON serialization, O(n) space for string concatenation
    """
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
    """
    Builds a prompt string for an LLM to generate an llms.txt file documenting a code repository.

    Constructs a formatted prompt that includes repository name, a list of up to 20 parsed files, and up to 10 top-ranked functions by PageRank score. The prompt instructs the LLM to generate documentation following a specific structure with sections for overview, architecture, entry points, key functions, and files to avoid modifying.

    Args:
        repo_name (str): The name of the repository to document.
        parsed_files (list[ParsedFile]): List of parsed file objects containing path and language information; only the first 20 are included in the prompt.
        top_functions (list[tuple[str, float]]): List of tuples containing function node IDs and their PageRank scores; only the top 10 are included in the prompt.

    Returns:
        str: A formatted prompt string instructing an LLM to generate an llms.txt file with specific sections and structure.

    Example:
        ```
        prompt = build_llms_txt_prompt('my-project', parsed_files, [('main.process_data', 0.1234), ('utils.helper', 0.0987)])
        ```

    Complexity: O(n + m) time where n is min(20, len(parsed_files)) and m is min(10, len(top_functions)), O(n + m) space
    """
    file_list = "\n".join(f"- {pf.path} ({pf.language})" for pf in parsed_files[:20])
    top_funcs = "\n".join(
        f"- {node_id} (score: {score:.4f})" for node_id, score in top_functions[:10]
    )
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
    """
    Constructs a formatted prompt string for a chatbot to answer questions about a codebase using retrieved code context.

    Builds a comprehensive prompt that includes the user's question, relevant code snippets from the codebase (or a placeholder if none exist), and instructions for the LLM on how to format its response with inline citations and code examples.

    Args:
        question (str): The user's question about the codebase to be answered.
        retrieved_contexts (list[RetrievedContext]): A list of RetrievedContext objects containing code snippets and metadata relevant to the question, or an empty list if no contexts were retrieved.

    Returns:
        str: A formatted prompt string containing the question, code context, and response rules for the LLM.

    Example:
        ```
        prompt = build_chat_prompt("What does the main function do?", [context1, context2])
        ```
    """
    context_str = (
        _format_context_snippet(retrieved_contexts)
        if retrieved_contexts
        else "(no code chunks indexed yet)"
    )
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
    """
    Builds a prompt string for checking if existing documentation has drifted from the current function implementation.

    Constructs a detailed prompt that instructs an LLM to compare a function's current code against its existing documentation. The prompt includes specific criteria for validation (parameter accuracy, return type, exceptions, and functionality) and requests a structured JSON response indicating whether documentation drift has occurred.

    Args:
        func (ParsedFunction): A parsed function object containing the function's source code and language.
        old_docstring (str): The existing documentation string to be validated against the current function implementation.

    Returns:
        str: A formatted prompt string containing the function code, existing documentation, validation criteria, and instructions for returning a JSON response with drift status and reason.

    Example:
        ```
        prompt = build_drift_check_prompt(parsed_func, \"\"\"Calculates sum of two numbers.\"\"\")
        ```
    """
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
