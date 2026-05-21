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
    Formats a list of retrieved code contexts into a single human-readable string of fenced source snippets with file locations and optional caller/callee metadata.

    Iterates over each RetrievedContext object and constructs a fenced code block prefixed with the file path and start line, truncating the source code to 800 characters. Optionally appends up to 3 callers and callees in 'function (path)' format. All individual snippets are joined with '\n\n---\n\n' horizontal dividers. Called internally by build_docstring_prompt() and build_chat_prompt() to assemble the context section of LLM prompts.

    Args:
        contexts (list[RetrievedContext]): A list of RetrievedContext objects, each containing a code chunk with file_path, start_line, and source attributes, along with callers and callees metadata lists of (path, function_name) tuples.

    Returns:
        str: A single formatted string of all context snippets separated by '\n\n---\n\n', where each snippet includes a file location header, a fenced source code block truncated to 800 characters, and optional Callers/Callees lines listing up to 3 entries each in 'function (path)' format.

    Example:
        ```
        formatted = _format_context_snippet(retrieved_contexts)
        # Output example:
        # File: core/utils/parser.py:42
        # ```
        # def parse_node(node):
        #     ...
        # ```
        # Callers: build_graph (core/graph.py)
        # Callees: extract_token (core/tokenizer.py)
        ```

    Complexity: O(n*m) time where n is the number of contexts and m is the average number of callers/callees per context (capped at 3); O(n) space for the list of formatted snippets.
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
    Builds a formatted prompt string for LLM-based documentation generation from a parsed function and its codebase context.

    Constructs a comprehensive prompt by combining function metadata (source code, parameters, return type, decorators, async status), caller/callee relationships from the retrieved context, style-specific formatting instructions, and a verbosity directive. The resulting prompt instructs the LLM to return a strictly structured JSON object conforming to a predefined documentation schema. Style instructions are resolved from an internal mapping keyed by DocStyle enum values, falling back to Google style if unrecognized. Verbosity is similarly resolved, defaulting to 'standard' behavior.

    Args:
        func (ParsedFunction): The parsed function object containing source code, parameters, return type annotation, decorators, and async status to be documented.
        context (RetrievedContext): The retrieved codebase context holding caller and callee relationships used to enrich the prompt with usage information.
        style (DocStyle): The documentation style enum value specifying the output format, such as DocStyle.GOOGLE, DocStyle.NUMPY, or DocStyle.JSDOC.
        language (str): The programming language of the function being documented, used to label fenced code blocks and tailor LLM instructions (e.g., 'python', 'typescript').
        verbosity (str): Controls the level of detail requested in the generated documentation; accepts 'concise', 'standard' (default), or 'detailed'.

    Returns:
        str: A fully formatted prompt string ready to be submitted to an LLM, containing function details, style and verbosity instructions, codebase context snippets, and a JSON schema example.

    Example:
        ```
        prompt = build_docstring_prompt(
            func=parsed_func,
            context=retrieved_context,
            style=DocStyle.GOOGLE,
            language='python',
            verbosity='detailed',
        )
        response = llm_client.complete(prompt)
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
    Builds a formatted prompt string instructing an LLM to generate a comprehensive README.md for a given repository.

    Constructs a structured prompt that directs an LLM to act as a technical writer and produce a README.md with six required sections: title, overview, installation, quick start, architecture, and contributing. The prompt embeds a concise summary of up to the first 30 parsed files, listing each file's path, function count, class count, and detected programming language to provide the LLM with repository context.

    Args:
        parsed_files (list[ParsedFile]): List of ParsedFile objects representing analyzed source files, each containing path, functions, classes, and language attributes. Only the first 30 entries are included in the prompt summary.
        repo_name (str): Name of the repository for which the README.md is being generated; used in the prompt title and section headings.

    Returns:
        str: A fully formatted multi-line prompt string containing LLM instructions, a repository file summary, and the required README.md section specifications.

    Example:
        ```
        prompt = build_readme_prompt(parsed_files, 'my-awesome-project')
        readme_text = llm_client.complete(prompt)
        ```

    Complexity: O(n) time and space where n is min(len(parsed_files), 30), due to iterating over and joining the file summary strings.
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
    Builds a formatted prompt string for an LLM to generate module-level documentation by combining file metadata, function signatures, and imports.

    Constructs a structured prompt that instructs an LLM to write a concise 2-4 sentence module-level docstring. The prompt includes up to 20 function signatures with their parameters and up to 10 imports from the parsed file. This function is called by generate_module_doc() in the LLM gateway layer.

    Args:
        parsed_file (ParsedFile): The parsed file object containing metadata such as file path, programming language, and import statements for the module being documented.
        functions (list[ParsedFunction]): A list of parsed function objects from the module, each containing a name and parameters list; only the first 20 functions are included in the prompt output.

    Returns:
        str: A formatted multi-line prompt string containing file context, function signatures, imports, and instructions for generating module-level documentation.

    Example:
        ```
        prompt = build_module_doc_prompt(parsed_file, [func1, func2, func3])
        response = llm.complete(prompt)
        ```

    Complexity: O(n + m) time where n is the number of functions (capped at 20) and m is the total number of parameters across those functions; O(1) additional space
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
    Builds a formatted prompt string instructing an LLM to generate OpenAPI 3.0 documentation for a given API endpoint.

    Constructs a multi-line f-string prompt that embeds serialized route information (as indented JSON) and the handler function's source code, directing a language model to produce a structured JSON response with OpenAPI fields including summary, description, parameters, requestBody, and responses.

    Args:
        func (ParsedFunction): A parsed function object containing the source code and metadata of the API handler function to be documented.
        route_info (dict): A dictionary containing route details such as HTTP method, path, and other endpoint metadata that will be serialized to indented JSON within the prompt.

    Returns:
        str: A formatted prompt string containing instructions, serialized route information, and the handler function source code for OpenAPI documentation generation.

    Example:
        ```
        prompt = build_openapi_prompt(parsed_func, {'method': 'GET', 'path': '/users/{id}', 'tags': ['users']})
        ```

    Complexity: O(n) time and space where n is the size of the route_info dict due to JSON serialization and string construction
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
    Builds a formatted prompt string instructing an LLM to generate a structured llms.txt documentation file for a given code repository.

    Constructs a prompt that includes the repository name, up to 20 parsed files with their paths and detected languages, and up to 10 top-ranked functions by PageRank score. The resulting prompt directs the LLM to produce an llms.txt file with standardized sections: Overview, Architecture, Entry points, Key functions, and Do not modify.

    Args:
        repo_name (str): The name of the repository to be documented, used as the title in the generated llms.txt content.
        parsed_files (list[ParsedFile]): List of parsed file objects each containing a path and language attribute; only the first 20 entries are included in the prompt.
        top_functions (list[tuple[str, float]]): List of tuples pairing a function node ID (str) with its PageRank score (float); only the top 10 entries are included in the prompt.

    Returns:
        str: A formatted multi-line prompt string that instructs an LLM to generate an llms.txt file with sections for overview, architecture, entry points, key functions, and files to avoid modifying.

    Example:
        ```
        prompt = build_llms_txt_prompt('my-project', parsed_files, [('main.process_data', 0.1234), ('utils.helper', 0.0987)])
        ```

    Complexity: O(n + m) time and space, where n is min(20, len(parsed_files)) and m is min(10, len(top_functions))
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
    Constructs a formatted prompt string that combines a user's codebase question, retrieved code context snippets, and LLM response rules into a single string ready for submission to a language model.

    Builds a comprehensive prompt by formatting the user's question alongside relevant code chunks retrieved from the repository. If no contexts are available, a placeholder string is used instead. The resulting prompt includes inline citation instructions, guidance on inferring answers from code structure, and rules for using code blocks, ensuring consistent and grounded LLM responses. Called by `chat_stream()` and `chat()` in `core/llm/gateway.py`.

    Args:
        question (str): The user's natural language question about the codebase to be answered by the LLM.
        retrieved_contexts (list[RetrievedContext]): A list of RetrievedContext objects containing code snippets and associated metadata (e.g., filename, line numbers) relevant to the question. Pass an empty list if no contexts were retrieved; a placeholder will be used in the prompt.

    Returns:
        str: A formatted multi-line prompt string containing the user's question, code context (or a placeholder), and LLM response rules including inline citation format and code block usage.

    Example:
        ```
        prompt = build_chat_prompt("What does the authenticate function do?", [context1, context2])
        response = llm.complete(prompt)
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
    Builds a formatted prompt string instructing an LLM to check whether existing documentation has drifted from the current function implementation.

    Constructs a detailed multi-line prompt that embeds the function's source code (formatted as a language-specific code block) and its existing docstring, along with four validation criteria: parameter name and type accuracy, return type accuracy, exception coverage, and overall functional accuracy. The prompt instructs the LLM to respond with a structured JSON object containing an `is_drifted` boolean and an optional `reason` string. This function is called by `check_drift()` in the LLM gateway module.

    Args:
        func (ParsedFunction): A parsed function object whose `source` attribute provides the raw function source code and `language` attribute provides the programming language used to format the fenced code block in the prompt.
        old_docstring (str): The existing documentation string to be validated against the current function implementation for potential drift.

    Returns:
        str: A formatted multi-line prompt string containing the function source code, existing documentation, four drift-validation criteria, and instructions for the LLM to return a JSON object with `is_drifted` (bool) and `reason` (str or null) fields.

    Example:
        ```
        prompt = build_drift_check_prompt(parsed_func, \"\"\"Calculates the sum of two numbers.\n\nArgs:\n    a (int): First number.\n    b (int): Second number.\n\nReturns:\n    int: The sum.\"\"\")
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
