from __future__ import annotations

import os
import textwrap
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.auth import verify_api_key

router = APIRouter(prefix="/llms-txt", tags=["llms-txt"], dependencies=[Depends(verify_api_key)])

SKIP_DIRS = {
    "node_modules",
    ".git",
    "__pycache__",
    "dist",
    "build",
    ".next",
    ".wright",
    "venv",
    ".venv",
}

# Dunder methods worth keeping — constructors, context managers, callables
_KEEP_DUNDERS = {"__init__", "__call__", "__enter__", "__exit__", "__new__", "__post_init__"}

# Void return types — omit from signature
_VOID_RETURNS = {"None", "void", "undefined", "never", "()", "null", "Promise<void>"}

# Decorators that add real signal for an LLM reader
_SIGNAL_DECORATOR_PREFIXES = (
    "@property",
    "@staticmethod",
    "@classmethod",
    "@abstractmethod",
    "@app.",
    "@router.",
    "@blueprint.",
    "@cached_property",
    "@override",
)


class LlmsTxtRequest(BaseModel):
    repo_root: str


# ── Docstring cleaners ────────────────────────────────────────────────────────


def _clean_python_doc(raw: str) -> str:
    """
    Strips surrounding quote delimiters and normalises indentation from a raw Python docstring string.

    Removes leading and trailing triple-quote or single-quote delimiters (in priority order: \"\"\", \'\'\', ", ') from the provided raw string, then applies textwrap.dedent to remove common leading whitespace, and finally strips any remaining surrounding whitespace. Intended to clean raw docstring literals extracted from source code before further processing. Called by _get_doc() and generate_llms_txt().

    Args:
        raw (str): The raw docstring text, potentially including surrounding triple-quote or single-quote delimiters and inconsistent indentation.

    Returns:
        str: A cleaned, dedented string with surrounding quote delimiters and extraneous whitespace removed.

    Example:
        ```
        cleaned = _clean_python_doc('\"\"\"\n    Fetches data from the API.\n    Retries on failure.\n    \"\"\"')
        # cleaned => 'Fetches data from the API.\nRetries on failure.'
        ```
    """
    s = raw.strip()
    for delim in ('"""', "'''", '"', "'"):
        if s.startswith(delim):
            s = s[len(delim) :]
            break
    for delim in ('"""', "'''", '"', "'"):
        if s.endswith(delim):
            s = s[: -len(delim)]
            break
    return textwrap.dedent(s).strip()


def _clean_jsdoc(raw: str) -> str:
    """
    Parses a raw JSDoc block string into a clean summary and structured tag lines.

    Strips JSDoc comment delimiters ('/**', '*/', and leading '* '), separates free-text summary content from tag lines (those beginning with '@'), and normalises '@param', '@returns'/'@return', and '@throws'/'@exception' tags by removing inline type annotations wrapped in curly braces. The processed result is returned as a single newline-joined string suitable for plain-text documentation output.

    Args:
        raw (str): The raw JSDoc comment block string, including delimiters such as '/**', '*/', and leading asterisks on each line.

    Returns:
        str: A cleaned, newline-joined string containing the joined summary text on the first line followed by normalised '@param', '@returns', and '@throws' tag lines with type annotations stripped.

    Example:
        ```
        raw = '/**\n * Adds two numbers.\n * @param {number} a - First operand.\n * @param {number} b - Second operand.\n * @returns {number} The sum.\n */'
        result = _clean_jsdoc(raw)
        # result == 'Adds two numbers.\n  @param a - First operand.\n  @param b - Second operand.\n  @returns The sum.'
        ```

    Complexity: O(n) time where n is the number of lines in the input, O(n) space for the collected lines and result list.
    """
    lines = []
    for line in raw.strip().splitlines():
        line = line.strip()
        if line in ("/**", "*/"):
            continue
        if line.startswith("* "):
            line = line[2:]
        elif line == "*":
            line = ""
        lines.append(line)

    summary_parts: list[str] = []
    tag_lines: list[str] = []
    in_tags = False

    for line in lines:
        if line.startswith("@"):
            in_tags = True
        if in_tags:
            tag_lines.append(line)
        elif line:
            summary_parts.append(line)

    result: list[str] = []
    if summary_parts:
        result.append(" ".join(summary_parts))

    for tag in tag_lines:
        if tag.startswith("@param"):
            rest = tag[6:].strip()
            if rest.startswith("{"):
                end = rest.find("}")
                if end != -1:
                    rest = rest[end + 1 :].strip()
            rest = rest.lstrip("- ").strip()
            if rest:
                result.append(f"  @param {rest}")
        elif tag.startswith(("@returns", "@return")):
            parts = tag.split(None, 1)
            rest = parts[1] if len(parts) > 1 else ""
            if rest.startswith("{"):
                end = rest.find("}")
                if end != -1:
                    rest = rest[end + 1 :].strip()
            if rest:
                result.append(f"  @returns {rest}")
        elif tag.startswith(("@throws", "@exception")):
            parts = tag.split(None, 1)
            rest = parts[1] if len(parts) > 1 else ""
            if rest:
                result.append(f"  @throws {rest}")

    return "\n".join(result)


def _clean_line_comment_doc(raw: str) -> str:
    """
    Cleans a raw line-comment docstring by stripping comment prefixes and truncating at Rust doc section headers.

    Iterates over each line of the raw string, removes leading comment markers (`///`, `// `, `//`), and stops processing when a Rust-style section header (e.g., `# Examples`, `# Panics`) is encountered. The resulting lines are joined and stripped to produce a clean, human-readable docstring.

    Args:
        raw (str): The raw docstring text containing line-comment prefixes such as `///`, `// `, or `//` to be cleaned.

    Returns:
        str: A cleaned docstring with comment prefixes removed and content after any Rust section header (`# ...`) truncated, joined as a single newline-separated string.

    Example:
        ```
        cleaned = _clean_line_comment_doc('/// Computes the sum.\n/// # Examples\n/// x + y')  # returns 'Computes the sum.'
        ```

    Complexity: O(n) time, O(n) space where n is the number of lines in the raw string.
    """
    result = []
    for line in raw.strip().splitlines():
        line = line.strip()
        if line.startswith("/// "):
            line = line[4:]
        elif line.startswith("///"):
            line = line[3:]
        elif line.startswith("// "):
            line = line[3:]
        elif line.startswith("//"):
            line = line[2:]
        # Stop at Rust doc section headers (# Examples, # Panics, etc.)
        if line.startswith("# "):
            break
        result.append(line)
    return "\n".join(result).strip()


def _get_doc(func) -> str:
    """
    Extracts and cleans the docstring from a function object in a language-aware manner.

    Inspects the language attribute of the given function object and delegates to the appropriate cleaning helper. Python docstrings are processed by `_clean_python_doc`, JavaScript and TypeScript JSDoc comments by `_clean_jsdoc`, and Go or Rust line-comment docs by `_clean_line_comment_doc`. For any other language, the raw docstring is returned stripped of leading/trailing whitespace. Returns an empty string if no existing docstring is found.

    Args:
        func (Any): A function-like object that exposes an `existing_docstring` attribute (the raw docstring text) and a `language` attribute (e.g., 'python', 'javascript', 'typescript', 'go', 'rust').

    Returns:
        str: A cleaned, human-readable docstring string appropriate for the function's programming language, or an empty string if no docstring exists.

    Example:
        ```
        cleaned = _get_doc(func_obj)  # where func_obj.language == 'python' and func_obj.existing_docstring == '\"\"\"  Compute sum.  \"\"\"'
        ```
    """
    raw = func.existing_docstring
    if not raw:
        return ""
    lang = func.language
    if lang == "python":
        return _clean_python_doc(raw)
    if lang in ("javascript", "typescript"):
        return _clean_jsdoc(raw)
    if lang in ("go", "rust"):
        return _clean_line_comment_doc(raw)
    return raw.strip()


# ── Signature builder ─────────────────────────────────────────────────────────


def _build_sig(func) -> str:
    """
    Builds a human-readable function signature string from a parsed function object, including parameters, type annotations, return type, and async prefix.

    Iterates over the function's parameters to construct a comma-separated argument list, appending type annotations where available. Handles void return types by omitting them, prepends 'async ' for asynchronous functions, and produces a final signature string in the format `[async ]name(params)[ -> return_type]`.

    Args:
        func (Any): A parsed function object (e.g., an AST node representation) with attributes: `parameters` (list of dicts with 'name' and optional 'type_annotation'), `return_type` (str or None), `is_async` (bool), and `name` (str).

    Returns:
        str: A formatted function signature string such as 'async fetch_data(url: str, timeout: int) -> dict' or 'process(items)' depending on the function's metadata.

    Example:
        ```
        sig = _build_sig(func_node)  # Returns 'async fetch_user(user_id: int, active: bool) -> UserModel'
        ```

    Complexity: O(n) time where n is the number of parameters, O(n) space for the parts list.
    """
    parts: list[str] = []
    for p in func.parameters or []:
        name = p.get("name", "")
        if not name:
            continue
        ann = p.get("type_annotation")
        parts.append(f"{name}: {ann}" if ann else name)

    ret_raw = (func.return_type or "").strip()
    ret = "" if ret_raw in _VOID_RETURNS else (f" -> {ret_raw}" if ret_raw else "")
    prefix = "async " if func.is_async else ""
    return f"{prefix}{func.name}({', '.join(parts)}){ret}"


def _relevant_decorators(decorators: list[str]) -> list[str]:
    """
    Filters a list of decorator strings to retain only those whose first line starts with a predefined signal decorator prefix.

    Iterates through each decorator string, extracts its first line, and checks whether it begins with any prefix defined in `_SIGNAL_DECORATOR_PREFIXES`. Only matching first lines are collected and returned. This is used by `_emit_func()` to isolate signal-related decorators from a broader set of decorators found on a function.

    Args:
        decorators (list[str]): A list of decorator strings to filter, each potentially spanning multiple lines.

    Returns:
        list[str]: A filtered list containing only the first lines of decorators that match one of the signal decorator prefixes defined in `_SIGNAL_DECORATOR_PREFIXES`.

    Example:
        ```
        filtered = _relevant_decorators(['@app.route("/api")', '@signal.emit("user_created")', '@other_decorator'])
        # filtered -> ['@signal.emit("user_created")']
        ```

    Complexity: O(n*m) time where n is the number of decorators and m is the number of signal decorator prefixes, O(k) space where k is the number of matching decorators.
    """
    kept = []
    for d in decorators:
        first_line = d.strip().split("\n")[0]
        if any(first_line.startswith(p) for p in _SIGNAL_DECORATOR_PREFIXES):
            kept.append(first_line)
    return kept


def _should_skip(func) -> bool:
    """
    Determines whether a function should be skipped based on its name being a dunder method not in the kept dunders list.

    Checks if a function's name starts and ends with double underscores (i.e., is a dunder/magic method) and is not present in the `_KEEP_DUNDERS` set. This is used as a filter in `_build_sig()` and `_emit_func()` to exclude unwanted dunder methods from documentation or signature generation.

    Args:
        func (Any): A function or method object with a `name` attribute, typically a tree-sitter node or similar parsed representation of a function.

    Returns:
        bool: Returns True if the function is a dunder method not present in `_KEEP_DUNDERS`, indicating it should be skipped; False otherwise.

    Example:
        ```
        # Assuming func.name == '__init__' and '__init__' is in _KEEP_DUNDERS
        should_skip = _should_skip(func)  # Returns False

        # Assuming func.name == '__repr__' and '__repr__' is NOT in _KEEP_DUNDERS
        should_skip = _should_skip(func)  # Returns True
        ```

    Complexity: O(1) time, O(1) space
    """
    n = func.name
    return n.startswith("__") and n.endswith("__") and n not in _KEEP_DUNDERS


# ── Line emitter ──────────────────────────────────────────────────────────────


def _emit_func(lines: list[str], func, indent: str = "") -> None:
    """
    Emits a formatted markdown entry for a single function or method into the provided lines list.

    Checks whether the given function node should be skipped, then builds its signature and appends a markdown heading with an optional line reference. Relevant decorators are appended, followed by the function's docstring if one exists. A blank line is added at the end to separate entries.

    Args:
        lines (list[str]): Accumulator list of markdown-formatted strings that the function appends output lines to.
        func (None): A parsed function or method node object exposing attributes such as start_line, decorators, and a docstring accessible via _get_doc().
        indent (str): Optional indentation prefix string prepended to each emitted line, used to reflect nesting level (e.g., methods inside a class).

    Example:
        ```
        lines = []
        _emit_func(lines, func_node, indent='  ')
        print('\n'.join(lines))
        ```
    """
    if _should_skip(func):
        return
    sig = _build_sig(func)
    line_ref = f"  *(line {func.start_line + 1})*" if func.start_line is not None else ""
    lines.append(f"{indent}### `{sig}`{line_ref}")

    for dec in _relevant_decorators(func.decorators or []):
        lines.append(f"{indent}{dec}")

    doc = _get_doc(func)
    if doc:
        for dl in doc.splitlines():
            lines.append(f"{indent}{dl}" if dl.strip() else "")

    lines.append("")


# ── Route ─────────────────────────────────────────────────────────────────────


@router.post("")
async def generate_llms_txt(body: LlmsTxtRequest) -> dict:
    """
    Generates a markdown-style llms.txt documentation file for a given repository by walking its directory tree, parsing code files with tree-sitter, and extracting functions and classes with their signatures and docstrings.

    Walks through the repository directory tree while skipping configured directories, detects supported languages using tree-sitter, and parses each file to extract functions, classes, and methods. The results are sorted by file path and formatted into a structured markdown document with metadata including generation timestamp, file count, function count, and an estimated LLM token usage count derived from content length.

    Args:
        body (LlmsTxtRequest): Request object containing the repository root path (repo_root) to generate documentation for.

    Returns:
        dict: Dictionary with four keys: 'content' (the generated llms.txt markdown string), 'file_count' (number of successfully parsed files containing at least one function or class), 'function_count' (total number of top-level functions plus all class methods across all parsed files), and 'token_estimate' (estimated LLM token count approximated as content length divided by 4).

    Raises:
        HTTPException: Raised with status_code=404 when the repository path specified in body.repo_root does not exist on the server.

    Example:
        ```
        result = await generate_llms_txt(LlmsTxtRequest(repo_root='/home/user/projects/my_repo'))
        print(result['file_count'])  # e.g. 42
        print(result['token_estimate'])  # e.g. 18500
        print(result['content'][:200])  # Prints the beginning of the generated llms.txt markdown
        ```

    Complexity: O(n * m) time where n is the number of files in the repository and m is the average file size; O(n) space for storing parsed file results.
    """
    from core.parser.tree_sitter_parser import CodeParser

    repo_path = Path(body.repo_root)
    if not repo_path.exists():
        raise HTTPException(status_code=404, detail="Repo not found on server.")

    repo_name = repo_path.name
    parser = CodeParser()
    parsed_files = []

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for filename in files:
            file_path = os.path.join(root, filename)
            lang = parser.detect_language(file_path)
            if not lang:
                continue
            try:
                parsed = parser.parse_file(file_path)
                if parsed.functions or parsed.classes:
                    parsed_files.append(parsed)
            except Exception:
                continue

    parsed_files.sort(key=lambda pf: pf.path)

    total_fns = sum(
        len(pf.functions) + sum(len(c.methods) for c in pf.classes) for pf in parsed_files
    )
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    lines: list[str] = []
    lines.append(f"# {repo_name}")
    lines.append("")
    lines.append(
        f"> Auto-generated llms.txt for {repo_name}. Provides codebase context for AI tools."
    )
    lines.append(
        f"> Generated: {generated_at}  |  {len(parsed_files)} files  |  {total_fns} functions"
    )
    lines.append("")

    for pf in parsed_files:
        rel = os.path.relpath(pf.path, repo_path)
        lines.append(f"## {rel}")
        lines.append("")

        for func in pf.functions:
            _emit_func(lines, func)

        for cls in pf.classes:
            lines.append(f"### class `{cls.name}`")
            if cls.docstring:
                doc = _clean_python_doc(cls.docstring)
                first = doc.splitlines()[0] if doc else ""
                if first:
                    lines.append(first)
            lines.append("")
            for method in cls.methods:
                _emit_func(lines, method, indent="  ")

    content = "\n".join(lines)
    token_estimate = len(content) // 4

    return {
        "content": content,
        "file_count": len(parsed_files),
        "function_count": total_fns,
        "token_estimate": token_estimate,
    }
