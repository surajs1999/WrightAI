from __future__ import annotations

from dataclasses import dataclass

from core.llm.prompts import DocStyle
from core.llm.schema import DocstringSchema
from core.parser.tree_sitter_parser import ParsedFunction


@dataclass
class InjectionResult:
    success: bool
    file_path: str
    function_name: str
    injected_at_line: int
    preview: str
    error: str | None


class DocstringInjector:
    def inject(
        self,
        file_path: str,
        func: ParsedFunction,
        docstring: DocstringSchema,
        style: DocStyle,
        dry_run: bool = False,
    ) -> InjectionResult:
        try:
            with open(file_path, "rb") as f:
                source_bytes = f.read()

            injection_point = self._find_injection_point(source_bytes, func)

            if injection_point < 0:
                snippet = source_bytes[func.start_byte : func.start_byte + 300].decode(
                    "utf-8", errors="replace"
                )
                return InjectionResult(
                    success=False,
                    file_path=file_path,
                    function_name=func.name,
                    injected_at_line=func.start_line,
                    preview="",
                    error=f"Could not find injection point (lang={func.language}, snippet={snippet!r})",
                )

            indent = self._get_body_indent(
                source_bytes, injection_point, func.language, func.start_byte
            )

            # Reconcile LLM-generated param names against the actual parsed signature.
            # Drop hallucinated names and reorder to match the real parameter order.
            if func.parameters and docstring.parameters:
                actual_names = [p["name"] for p in func.parameters]
                actual_set = set(actual_names)
                by_name = {p.name: p for p in docstring.parameters if p.name in actual_set}
                docstring = docstring.model_copy(update={
                    "parameters": [by_name[n] for n in actual_names if n in by_name]
                })

            formatted = self.format_docstring(docstring, style, func.language, indent)

            if self._has_existing_docstring(func):
                new_source_bytes = self._replace_existing_docstring_bytes(
                    source_bytes, func, formatted
                )
            else:
                inject_bytes = formatted.encode("utf-8")
                new_source_bytes = (
                    source_bytes[:injection_point] + inject_bytes + source_bytes[injection_point:]
                )

            injected_line = source_bytes[:injection_point].count(b"\n")

            if not dry_run:
                with open(file_path, "wb") as f:
                    f.write(new_source_bytes)

                # Fix 4: for Python only, validate the result parses cleanly.
                # (JS/TS/Go/Rust/Java require their own parsers — skip them here.)
                if func.language == "python":
                    try:
                        import ast as _ast

                        _ast.parse(new_source_bytes.decode("utf-8", errors="replace"))
                    except SyntaxError as e:
                        # Injection broke the file — restore original
                        with open(file_path, "wb") as f:
                            f.write(source_bytes)
                        return InjectionResult(
                            success=False,
                            file_path=file_path,
                            function_name=func.name,
                            injected_at_line=injected_line,
                            preview=formatted,
                            error=f"Injection produced invalid syntax (restored original): {e}",
                        )

            return InjectionResult(
                success=True,
                file_path=file_path,
                function_name=func.name,
                injected_at_line=injected_line,
                preview=formatted,
                error=None,
            )
        except Exception as e:
            return InjectionResult(
                success=False,
                file_path=file_path,
                function_name=func.name,
                injected_at_line=func.start_line,
                preview="",
                error=str(e),
            )

    def _get_body_indent(
        self, source_bytes: bytes, injection_point: int, language: str, func_start_byte: int
    ) -> int:
        if language == "python":
            # injection_point is the first byte of the function body — count its leading spaces.
            count = 0
            i = injection_point
            while i < len(source_bytes) and source_bytes[i : i + 1] in (b" ", b"\t"):
                count += 1
                i += 1
            return count
        else:
            # For JS/TS/Java/Go/Rust the injection point IS func_start_byte (before the function).
            # Derive indent from the start of that line.
            line_start = source_bytes.rfind(b"\n", 0, func_start_byte)
            line_start = line_start + 1 if line_start >= 0 else 0
            count = 0
            i = line_start
            while i < len(source_bytes) and source_bytes[i : i + 1] in (b" ", b"\t"):
                count += 1
                i += 1
            return count

    def _find_injection_point(self, source_bytes: bytes, func: ParsedFunction) -> int:
        lang = func.language

        if lang == "python":
            func_bytes = source_bytes[func.start_byte : func.end_byte]

            # Fix 2: func.start_byte may point to a decorator (@something), not the def
            # line. Scan forward line-by-line until we find 'def ' or 'async def '.
            def_offset = 0
            i = 0
            while i < len(func_bytes):
                if func_bytes[i : i + 4] == b"def " or func_bytes[i : i + 10] == b"async def ":
                    def_offset = i
                    break
                nl = func_bytes.find(b"\n", i)
                if nl < 0:
                    break
                i = nl + 1

            # Scan the def line for its closing colon, tracking parens/brackets/strings
            # so we don't mistake a colon inside a type annotation or default value.
            scan_bytes = func_bytes[def_offset:]
            colon_pos = -1
            paren_depth = 0
            bracket_depth = 0
            brace_depth = 0
            in_string = False
            string_char = b""
            triple = False
            i = 0
            while i < len(scan_bytes):
                b = scan_bytes[i : i + 1]
                if in_string:
                    # Handle triple-quote end
                    if triple and scan_bytes[i : i + 3] == string_char * 3:
                        in_string = False
                        i += 3
                        continue
                    elif not triple and b == string_char and scan_bytes[i - 1 : i] != b"\\":
                        in_string = False
                elif scan_bytes[i : i + 3] in (b'"""', b"'''"):
                    in_string = True
                    triple = True
                    string_char = b
                    i += 3
                    continue
                elif b in (b'"', b"'"):
                    in_string = True
                    triple = False
                    string_char = b
                elif b == b"(":
                    paren_depth += 1
                elif b == b")":
                    paren_depth -= 1
                elif b == b"[":
                    bracket_depth += 1
                elif b == b"]":
                    bracket_depth -= 1
                elif b == b"{":
                    brace_depth += 1
                elif b == b"}":
                    brace_depth -= 1
                elif (
                    b == b":"
                    and paren_depth == 0
                    and bracket_depth == 0
                    and brace_depth == 0
                    and not in_string
                ):
                    colon_pos = i
                    break
                i += 1

            if colon_pos < 0:
                return -1
            newline_pos = scan_bytes.find(b"\n", colon_pos)
            if newline_pos < 0:
                return func.start_byte + def_offset + colon_pos + 1
            return func.start_byte + def_offset + newline_pos + 1

        elif lang in ("javascript", "typescript", "java", "go", "rust"):
            # Fix 3: comments go BEFORE the function node. func.start_byte may be
            # mid-line (e.g. after 'export ' keyword). Snap to the start of that line
            # so the comment is placed on its own line at the correct column.
            line_start = source_bytes.rfind(b"\n", 0, func.start_byte)
            return line_start + 1 if line_start >= 0 else 0

        return -1

    def _has_existing_docstring(self, func: ParsedFunction) -> bool:
        return func.existing_docstring is not None

    def _replace_existing_docstring_bytes(
        self, source_bytes: bytes, func: ParsedFunction, new_doc: str
    ) -> bytes:
        import re as _re

        if func.existing_docstring is None:
            return source_bytes

        source_str = source_bytes.decode("utf-8", errors="replace")
        func_end_char = len(source_bytes[: func.end_byte].decode("utf-8", errors="replace"))

        if func.language == "python":
            # existing_docstring stores content only (no triple-quote delimiters).
            # Replace the entire first triple-quoted literal in the function body.
            func_region_start = len(
                source_bytes[: func.start_byte].decode("utf-8", errors="replace")
            )
            func_region = source_str[func_region_start:func_end_char]
            # Include leading whitespace so new_doc's own indentation doesn't double up.
            new_func_region = _re.sub(
                r'[ \t]*(?:"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\')',
                lambda m: new_doc.rstrip("\n"),
                func_region,
                count=1,
            )
            return (
                source_str[:func_region_start] + new_func_region + source_str[func_end_char:]
            ).encode("utf-8")
        else:
            # Comment lives BEFORE func.start_byte — extend search back 2 kB to capture it
            old_doc = func.existing_docstring
            pre_start = max(0, func.start_byte - 2000)
            region_start_char = len(source_bytes[:pre_start].decode("utf-8", errors="replace"))
            region = source_str[region_start_char:func_end_char]
            new_region = region.replace(old_doc, new_doc, 1)
            return (
                source_str[:region_start_char] + new_region + source_str[func_end_char:]
            ).encode("utf-8")

    @staticmethod
    def _safe(text: str) -> str:
        """Escape triple-quote sequences so they can't break a Python docstring."""
        return text.replace('"""', r"\"\"\"").replace("'''", r"\'\'\'")

    def format_docstring(
        self,
        doc: DocstringSchema,
        style: DocStyle,
        language: str,
        indent: int,
    ) -> str:
        pad = " " * indent
        inner_pad = " " * (indent + 4)

        # Language-native formats always take precedence over user style choice.
        if language in ("javascript", "typescript", "java"):
            return self._format_jsdoc(doc, pad)
        if language == "go":
            return self._format_go(doc, pad)
        if language == "rust":
            return self._format_rust(doc, pad)

        # For Python, respect the requested style.
        if style == DocStyle.NUMPY:
            return self._format_numpy(doc, pad, inner_pad)
        if style == DocStyle.EPYTEXT:
            return self._format_epytext(doc, pad)
        if style == DocStyle.JSDOC:
            return self._format_jsdoc(doc, pad)
        return self._format_google(doc, pad, inner_pad)

    def _format_google(self, doc: DocstringSchema, pad: str, inner_pad: str) -> str:
        s = self._safe
        lines = [f'{pad}"""']
        lines.append(f"{pad}{s(doc.summary)}")
        if doc.description:
            lines.append("")
            lines.append(f"{pad}{s(doc.description)}")
        if doc.parameters:
            lines.append("")
            lines.append(f"{pad}Args:")
            for param in doc.parameters:
                type_str = f" ({s(param.type_hint)})" if param.type_hint else ""
                lines.append(f"{inner_pad}{param.name}{type_str}: {s(param.description)}")
        if doc.returns:
            lines.append("")
            lines.append(f"{pad}Returns:")
            type_str = f"{s(doc.returns.type_hint)}: " if doc.returns.type_hint else ""
            lines.append(f"{inner_pad}{type_str}{s(doc.returns.description)}")
        if doc.raises:
            lines.append("")
            lines.append(f"{pad}Raises:")
            for exc in doc.raises:
                lines.append(f"{inner_pad}{s(exc.exception)}: {s(exc.condition)}")
        if doc.example:
            lines.append("")
            lines.append(f"{pad}Example:")
            lines.append(f"{inner_pad}```")
            for line in doc.example.split("\n"):
                lines.append(f"{inner_pad}{s(line)}")
            lines.append(f"{inner_pad}```")
        if doc.complexity:
            lines.append("")
            lines.append(f"{pad}Complexity: {s(doc.complexity)}")
        if doc.side_effects:
            lines.append("")
            lines.append(f"{pad}Side Effects:")
            lines.append(f"{inner_pad}{s(doc.side_effects)}")
        if doc.notes:
            lines.append("")
            lines.append(f"{pad}Notes:")
            lines.append(f"{inner_pad}{s(doc.notes)}")
        lines.append(f'{pad}"""')
        lines.append("")
        return "\n".join(lines)

    def _format_numpy(self, doc: DocstringSchema, pad: str, inner_pad: str) -> str:
        s = self._safe
        lines = [f'{pad}"""']
        lines.append(f"{pad}{s(doc.summary)}")
        if doc.description:
            lines.append("")
            lines.append(f"{pad}{s(doc.description)}")
        if doc.parameters:
            lines.append("")
            lines.append(f"{pad}Parameters")
            lines.append(f"{pad}----------")
            for param in doc.parameters:
                type_str = f" : {s(param.type_hint)}" if param.type_hint else ""
                lines.append(f"{pad}{param.name}{type_str}")
                lines.append(f"{inner_pad}{s(param.description)}")
        if doc.returns:
            lines.append("")
            lines.append(f"{pad}Returns")
            lines.append(f"{pad}-------")
            type_str = f"{s(doc.returns.type_hint)}" if doc.returns.type_hint else "value"
            lines.append(f"{pad}{type_str}")
            lines.append(f"{inner_pad}{s(doc.returns.description)}")
        if doc.raises:
            lines.append("")
            lines.append(f"{pad}Raises")
            lines.append(f"{pad}------")
            for exc in doc.raises:
                lines.append(f"{pad}{s(exc.exception)}")
                lines.append(f"{inner_pad}{s(exc.condition)}")
        if doc.example:
            lines.append("")
            lines.append(f"{pad}Examples")
            lines.append(f"{pad}--------")
            for line in doc.example.split("\n"):
                lines.append(f"{pad}{s(line)}")
        lines.append(f'{pad}"""')
        lines.append("")
        return "\n".join(lines)

    @staticmethod
    def _safe_jsdoc(text: str) -> str:
        """Replace /** sequences that would confuse tree-sitter inside JSDoc comments."""
        return text.replace("/**", "/* *")

    def _format_jsdoc(self, doc: DocstringSchema, pad: str) -> str:
        s = self._safe_jsdoc
        lines = [f"{pad}/**"]
        lines.append(f"{pad} * {s(doc.summary)}")
        if doc.description:
            lines.append(f"{pad} *")
            lines.append(f"{pad} * {s(doc.description)}")
        if doc.parameters:
            lines.append(f"{pad} *")
            for param in doc.parameters:
                type_str = f"{{{s(param.type_hint)}}}" if param.type_hint else "{*}"
                lines.append(f"{pad} * @param {type_str} {param.name} - {s(param.description)}")
        if doc.returns:
            type_str = f"{{{s(doc.returns.type_hint)}}}" if doc.returns.type_hint else "{*}"
            lines.append(f"{pad} * @returns {type_str} {s(doc.returns.description)}")
        if doc.raises:
            for exc in doc.raises:
                lines.append(f"{pad} * @throws {{{s(exc.exception)}}} {s(exc.condition)}")
        if doc.example:
            lines.append(f"{pad} * @example")
            for line in doc.example.split("\n"):
                lines.append(f"{pad} * {s(line)}")
        if doc.side_effects:
            lines.append(f"{pad} * @sideEffects {s(doc.side_effects)}")
        if doc.notes:
            lines.append(f"{pad} * @notes {s(doc.notes)}")
        lines.append(f"{pad} */")
        lines.append("")
        return "\n".join(lines)

    def _format_epytext(self, doc: DocstringSchema, pad: str) -> str:
        s = self._safe
        lines = [f'{pad}"""']
        lines.append(f"{pad}{s(doc.summary)}")
        if doc.description:
            lines.append("")
            lines.append(f"{pad}{s(doc.description)}")
        for param in doc.parameters:
            lines.append(f"{pad}@param {param.name}: {s(param.description)}")
            if param.type_hint:
                lines.append(f"{pad}@type {param.name}: {s(param.type_hint)}")
        if doc.returns:
            lines.append(f"{pad}@return: {s(doc.returns.description)}")
            if doc.returns.type_hint:
                lines.append(f"{pad}@rtype: {s(doc.returns.type_hint)}")
        for exc in doc.raises:
            lines.append(f"{pad}@raise {s(exc.exception)}: {s(exc.condition)}")
        lines.append(f'{pad}"""')
        lines.append("")
        return "\n".join(lines)

    def _format_rust(self, doc: DocstringSchema, pad: str) -> str:
        lines = [f"{pad}/// {doc.summary}"]
        if doc.description:
            lines.append(f"{pad}///")
            lines.append(f"{pad}/// {doc.description}")
        if doc.parameters:
            lines.append(f"{pad}///")
            lines.append(f"{pad}/// # Arguments")
            lines.append(f"{pad}///")
            for param in doc.parameters:
                type_str = f": `{param.type_hint}`" if param.type_hint else ""
                lines.append(f"{pad}/// * `{param.name}`{type_str} - {param.description}")
        if doc.returns:
            lines.append(f"{pad}///")
            lines.append(f"{pad}/// # Returns")
            lines.append(f"{pad}///")
            lines.append(f"{pad}/// {doc.returns.description}")
        if doc.example:
            lines.append(f"{pad}///")
            lines.append(f"{pad}/// # Examples")
            lines.append(f"{pad}///")
            lines.append(f"{pad}/// ```")
            for line in doc.example.split("\n"):
                lines.append(f"{pad}/// {line}")
            lines.append(f"{pad}/// ```")
        lines.append("")
        return "\n".join(lines)

    def _format_go(self, doc: DocstringSchema, pad: str) -> str:
        lines = [f"{pad}// {doc.summary}"]
        if doc.description:
            lines.append(f"{pad}//")
            lines.append(f"{pad}// {doc.description}")
        if doc.parameters:
            lines.append(f"{pad}//")
            for param in doc.parameters:
                type_str = f" ({param.type_hint})" if param.type_hint else ""
                lines.append(f"{pad}// {param.name}{type_str}: {param.description}")
        if doc.returns:
            lines.append(f"{pad}//")
            type_str = f"({doc.returns.type_hint}) " if doc.returns.type_hint else ""
            lines.append(f"{pad}// Returns: {type_str}{doc.returns.description}")
        if doc.raises:
            lines.append(f"{pad}//")
            for exc in doc.raises:
                lines.append(f"{pad}// Errors: {exc.exception} — {exc.condition}")
        lines.append("")
        return "\n".join(lines)
