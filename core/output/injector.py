from __future__ import annotations

import os
import re
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

            indent = self._get_indent(source_bytes, func)
            formatted = self.format_docstring(docstring, style, func.language, indent)
            injection_point = self._find_injection_point(source_bytes, func)

            if injection_point < 0:
                snippet = source_bytes[func.start_byte:func.start_byte + 300].decode("utf-8", errors="replace")
                return InjectionResult(
                    success=False,
                    file_path=file_path,
                    function_name=func.name,
                    injected_at_line=func.start_line,
                    preview=formatted,
                    error=f"Could not find injection point (lang={func.language}, snippet={snippet!r})",
                )

            if self._has_existing_docstring(func):
                new_source_bytes = self._replace_existing_docstring_bytes(source_bytes, func, formatted)
            else:
                inject_bytes = formatted.encode("utf-8")
                new_source_bytes = source_bytes[:injection_point] + inject_bytes + source_bytes[injection_point:]

            injected_line = source_bytes[:injection_point].count(b"\n")

            if not dry_run:
                with open(file_path, "wb") as f:
                    f.write(new_source_bytes)

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

    def _get_indent(self, source_bytes: bytes, func: ParsedFunction) -> int:
        lines = source_bytes.decode("utf-8", errors="replace").split("\n")
        if func.start_line < len(lines):
            line = lines[func.start_line]
            return len(line) - len(line.lstrip())
        return 0

    def _find_injection_point(self, source_bytes: bytes, func: ParsedFunction) -> int:
        lang = func.language

        if lang == "python":
            func_bytes = source_bytes[func.start_byte:func.end_byte]
            # Walk the signature tracking (), [] and simple strings to find the
            # closing colon of the def statement (not a colon inside type hints).
            colon_pos = -1
            paren_depth = 0
            bracket_depth = 0
            in_string = False
            string_char = b""
            i = 0
            while i < len(func_bytes):
                b = func_bytes[i:i+1]
                if in_string:
                    if b == string_char and (i == 0 or func_bytes[i-1:i] != b"\\"):
                        in_string = False
                elif b in (b'"', b"'"):
                    in_string = True
                    string_char = b
                elif b == b"(":
                    paren_depth += 1
                elif b == b")":
                    paren_depth -= 1
                elif b == b"[":
                    bracket_depth += 1
                elif b == b"]":
                    bracket_depth -= 1
                elif b == b":" and paren_depth == 0 and bracket_depth == 0:
                    colon_pos = i
                    break
                i += 1

            if colon_pos < 0:
                return -1
            newline_pos = func_bytes.find(b"\n", colon_pos)
            if newline_pos < 0:
                # Single-line function — inject right after the colon
                return func.start_byte + colon_pos + 1
            return func.start_byte + newline_pos + 1

        elif lang in ("javascript", "typescript"):
            func_bytes = source_bytes[func.start_byte:func.end_byte]
            # Find the body-opening { at paren depth 0 (skip object types in params/return)
            paren_depth = 0
            for i, raw in enumerate(func_bytes):
                ch = chr(raw)
                if ch == "(":
                    paren_depth += 1
                elif ch == ")":
                    paren_depth -= 1
                elif ch == "{" and paren_depth == 0:
                    newline_pos = func_bytes.find(b"\n", i)
                    if newline_pos < 0:
                        return func.start_byte + i + 1
                    return func.start_byte + newline_pos + 1

            # Arrow function without a block body — inject after =>
            arrow_pos = func_bytes.find(b"=>")
            if arrow_pos >= 0:
                after = arrow_pos + 2
                while after < len(func_bytes) and func_bytes[after:after+1] in (b" ", b"\t"):
                    after += 1
                return func.start_byte + after
            return -1

        elif lang == "java":
            func_bytes = source_bytes[func.start_byte:func.end_byte]
            brace_pos = func_bytes.find(b"{")
            if brace_pos < 0:
                return -1
            newline_pos = func_bytes.find(b"\n", brace_pos)
            if newline_pos < 0:
                return func.start_byte + brace_pos + 1
            return func.start_byte + newline_pos + 1

        elif lang == "go":
            func_bytes = source_bytes[func.start_byte:func.end_byte]
            brace_pos = func_bytes.find(b"{")
            if brace_pos < 0:
                return -1
            newline_pos = func_bytes.find(b"\n", brace_pos)
            if newline_pos < 0:
                return func.start_byte + brace_pos + 1
            return func.start_byte + newline_pos + 1

        elif lang == "rust":
            # Rust doc comments go BEFORE the function
            return func.start_byte

        return -1

    def _has_existing_docstring(self, func: ParsedFunction) -> bool:
        return func.existing_docstring is not None

    def _replace_existing_docstring_bytes(
        self, source_bytes: bytes, func: ParsedFunction, new_doc: str
    ) -> bytes:
        if func.existing_docstring is None:
            return source_bytes

        source_str = source_bytes.decode("utf-8", errors="replace")
        old_doc = func.existing_docstring
        # Find and replace the old docstring in the function source region
        func_region_start = len(source_bytes[:func.start_byte].decode("utf-8", errors="replace"))
        func_region_end = len(source_bytes[:func.end_byte].decode("utf-8", errors="replace"))
        func_region = source_str[func_region_start:func_region_end]

        # Replace first occurrence of old docstring in function region
        new_func_region = func_region.replace(old_doc, new_doc, 1)
        new_source = source_str[:func_region_start] + new_func_region + source_str[func_region_end:]
        return new_source.encode("utf-8")

    def format_docstring(
        self,
        doc: DocstringSchema,
        style: DocStyle,
        language: str,
        indent: int,
    ) -> str:
        pad = " " * indent
        inner_pad = " " * (indent + 4)

        if style == DocStyle.GOOGLE or (language == "python" and style not in (DocStyle.NUMPY, DocStyle.EPYTEXT, DocStyle.JSDOC)):
            return self._format_google(doc, pad, inner_pad)
        elif style == DocStyle.NUMPY:
            return self._format_numpy(doc, pad, inner_pad)
        elif style == DocStyle.JSDOC or language in ("javascript", "typescript"):
            return self._format_jsdoc(doc, pad)
        elif style == DocStyle.EPYTEXT:
            return self._format_epytext(doc, pad)
        elif style == DocStyle.RUST or language == "rust":
            return self._format_rust(doc, pad)
        else:
            return self._format_google(doc, pad, inner_pad)

    def _format_google(self, doc: DocstringSchema, pad: str, inner_pad: str) -> str:
        lines = [f'{pad}"""']
        lines.append(f"{pad}{doc.summary}")
        if doc.description:
            lines.append("")
            lines.append(f"{pad}{doc.description}")
        if doc.parameters:
            lines.append("")
            lines.append(f"{pad}Args:")
            for param in doc.parameters:
                type_str = f" ({param.type_hint})" if param.type_hint else ""
                lines.append(f"{inner_pad}{param.name}{type_str}: {param.description}")
        if doc.returns:
            lines.append("")
            lines.append(f"{pad}Returns:")
            type_str = f"{doc.returns.type_hint}: " if doc.returns.type_hint else ""
            lines.append(f"{inner_pad}{type_str}{doc.returns.description}")
        if doc.raises:
            lines.append("")
            lines.append(f"{pad}Raises:")
            for exc in doc.raises:
                lines.append(f"{inner_pad}{exc.exception}: {exc.condition}")
        if doc.example:
            lines.append("")
            lines.append(f"{pad}Example:")
            lines.append(f"{inner_pad}```")
            for line in doc.example.split("\n"):
                lines.append(f"{inner_pad}{line}")
            lines.append(f"{inner_pad}```")
        if doc.complexity:
            lines.append("")
            lines.append(f"{pad}Complexity: {doc.complexity}")
        lines.append(f'{pad}"""')
        lines.append("")
        return "\n".join(lines)

    def _format_numpy(self, doc: DocstringSchema, pad: str, inner_pad: str) -> str:
        lines = [f'{pad}"""']
        lines.append(f"{pad}{doc.summary}")
        if doc.description:
            lines.append("")
            lines.append(f"{pad}{doc.description}")
        if doc.parameters:
            lines.append("")
            lines.append(f"{pad}Parameters")
            lines.append(f"{pad}----------")
            for param in doc.parameters:
                type_str = f" : {param.type_hint}" if param.type_hint else ""
                lines.append(f"{pad}{param.name}{type_str}")
                lines.append(f"{inner_pad}{param.description}")
        if doc.returns:
            lines.append("")
            lines.append(f"{pad}Returns")
            lines.append(f"{pad}-------")
            type_str = f"{doc.returns.type_hint}" if doc.returns.type_hint else "value"
            lines.append(f"{pad}{type_str}")
            lines.append(f"{inner_pad}{doc.returns.description}")
        if doc.raises:
            lines.append("")
            lines.append(f"{pad}Raises")
            lines.append(f"{pad}------")
            for exc in doc.raises:
                lines.append(f"{pad}{exc.exception}")
                lines.append(f"{inner_pad}{exc.condition}")
        if doc.example:
            lines.append("")
            lines.append(f"{pad}Examples")
            lines.append(f"{pad}--------")
            for line in doc.example.split("\n"):
                lines.append(f"{pad}{line}")
        lines.append(f'{pad}"""')
        lines.append("")
        return "\n".join(lines)

    def _format_jsdoc(self, doc: DocstringSchema, pad: str) -> str:
        lines = [f"{pad}/**"]
        lines.append(f"{pad} * {doc.summary}")
        if doc.description:
            lines.append(f"{pad} *")
            lines.append(f"{pad} * {doc.description}")
        if doc.parameters:
            lines.append(f"{pad} *")
            for param in doc.parameters:
                type_str = f"{{{param.type_hint}}}" if param.type_hint else "{*}"
                lines.append(f"{pad} * @param {type_str} {param.name} - {param.description}")
        if doc.returns:
            type_str = f"{{{doc.returns.type_hint}}}" if doc.returns.type_hint else "{*}"
            lines.append(f"{pad} * @returns {type_str} {doc.returns.description}")
        if doc.raises:
            for exc in doc.raises:
                lines.append(f"{pad} * @throws {{{exc.exception}}} {exc.condition}")
        if doc.example:
            lines.append(f"{pad} * @example")
            for line in doc.example.split("\n"):
                lines.append(f"{pad} * {line}")
        lines.append(f"{pad} */")
        lines.append("")
        return "\n".join(lines)

    def _format_epytext(self, doc: DocstringSchema, pad: str) -> str:
        lines = [f'{pad}"""']
        lines.append(f"{pad}{doc.summary}")
        if doc.description:
            lines.append("")
            lines.append(f"{pad}{doc.description}")
        for param in doc.parameters:
            lines.append(f"{pad}@param {param.name}: {param.description}")
            if param.type_hint:
                lines.append(f"{pad}@type {param.name}: {param.type_hint}")
        if doc.returns:
            lines.append(f"{pad}@return: {doc.returns.description}")
            if doc.returns.type_hint:
                lines.append(f"{pad}@rtype: {doc.returns.type_hint}")
        for exc in doc.raises:
            lines.append(f"{pad}@raise {exc.exception}: {exc.condition}")
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
