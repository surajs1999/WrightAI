from __future__ import annotations

import os
import textwrap
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.auth import verify_api_key

router = APIRouter(prefix="/llms-txt", tags=["llms-txt"], dependencies=[Depends(verify_api_key)])

SKIP_DIRS = {"node_modules", ".git", "__pycache__", "dist", "build", ".next", ".wright", "venv", ".venv"}

# Dunder methods worth keeping — constructors, context managers, callables
_KEEP_DUNDERS = {"__init__", "__call__", "__enter__", "__exit__", "__new__", "__post_init__"}

# Void return types — omit from signature
_VOID_RETURNS = {"None", "void", "undefined", "never", "()", "null", "Promise<void>"}

# Decorators that add real signal for an LLM reader
_SIGNAL_DECORATOR_PREFIXES = (
    "@property", "@staticmethod", "@classmethod", "@abstractmethod",
    "@app.", "@router.", "@blueprint.", "@cached_property", "@override",
)


class LlmsTxtRequest(BaseModel):
    repo_root: str


# ── Docstring cleaners ────────────────────────────────────────────────────────

def _clean_python_doc(raw: str) -> str:
    """Strip quote delimiters and normalise indentation."""
    s = raw.strip()
    for delim in ('"""', "'''", '"', "'"):
        if s.startswith(delim):
            s = s[len(delim):]
            break
    for delim in ('"""', "'''", '"', "'"):
        if s.endswith(delim):
            s = s[: -len(delim)]
            break
    return textwrap.dedent(s).strip()


def _clean_jsdoc(raw: str) -> str:
    """Parse a JSDoc block into a clean summary + structured tags."""
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
                    rest = rest[end + 1:].strip()
            rest = rest.lstrip("- ").strip()
            if rest:
                result.append(f"  @param {rest}")
        elif tag.startswith(("@returns", "@return")):
            parts = tag.split(None, 1)
            rest = parts[1] if len(parts) > 1 else ""
            if rest.startswith("{"):
                end = rest.find("}")
                if end != -1:
                    rest = rest[end + 1:].strip()
            if rest:
                result.append(f"  @returns {rest}")
        elif tag.startswith(("@throws", "@exception")):
            parts = tag.split(None, 1)
            rest = parts[1] if len(parts) > 1 else ""
            if rest:
                result.append(f"  @throws {rest}")

    return "\n".join(result)


def _clean_line_comment_doc(raw: str) -> str:
    """Strip // and /// prefixes from Go/Rust doc comments. Stops at doc section headers."""
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
    """Return a cleaned docstring for the given function, language-aware."""
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
    """Typed, compact function signature."""
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
    kept = []
    for d in decorators:
        first_line = d.strip().split("\n")[0]
        if any(first_line.startswith(p) for p in _SIGNAL_DECORATOR_PREFIXES):
            kept.append(first_line)
    return kept


def _should_skip(func) -> bool:
    """True for dunder methods that add no useful signal."""
    n = func.name
    return n.startswith("__") and n.endswith("__") and n not in _KEEP_DUNDERS


# ── Line emitter ──────────────────────────────────────────────────────────────

def _emit_func(lines: list[str], func, indent: str = "") -> None:
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
        len(pf.functions) + sum(len(c.methods) for c in pf.classes)
        for pf in parsed_files
    )
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    lines: list[str] = []
    lines.append(f"# {repo_name}")
    lines.append("")
    lines.append(f"> Auto-generated llms.txt for {repo_name}. Provides codebase context for AI tools.")
    lines.append(f"> Generated: {generated_at}  |  {len(parsed_files)} files  |  {total_fns} functions")
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
