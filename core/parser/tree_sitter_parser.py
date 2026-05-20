from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any

import tree_sitter_python as tspython
import tree_sitter_javascript as tsjavascript
import tree_sitter_typescript as tstypescript
import tree_sitter_java as tsjava
import tree_sitter_go as tsgo
import tree_sitter_rust as tsrust
from tree_sitter import Language, Parser, Node


@dataclass
class ParsedFunction:
    name: str
    language: str
    file_path: str
    start_byte: int
    end_byte: int
    start_line: int
    end_line: int
    source: str
    existing_docstring: str | None
    parameters: list[dict[str, Any]]
    return_type: str | None
    is_async: bool
    decorators: list[str]


@dataclass
class ParsedClass:
    name: str
    language: str
    file_path: str
    start_byte: int
    end_byte: int
    start_line: int
    end_line: int
    source: str
    methods: list[ParsedFunction] = field(default_factory=list)
    docstring: str | None = None


@dataclass
class ParsedFile:
    path: str
    language: str
    functions: list[ParsedFunction]
    classes: list[ParsedClass]
    imports: list[str]
    last_modified: float


class CodeParser:
    SUPPORTED_LANGUAGES: dict[str, list[str]] = {
        "python": [".py"],
        "javascript": [".js", ".mjs"],
        "typescript": [".ts", ".tsx"],
        "java": [".java"],
        "go": [".go"],
        "rust": [".rs"],
    }

    def __init__(self) -> None:
        self._parsers: dict[str, Parser] = {}
        self._languages: dict[str, Language] = {}
        self._init_languages()

    def _init_languages(self) -> None:
        lang_map = {
            "python": tspython.language(),
            "javascript": tsjavascript.language(),
            "java": tsjava.language(),
            "go": tsgo.language(),
            "rust": tsrust.language(),
        }
        # TypeScript has separate language() and language_tsx()
        try:
            lang_map["typescript"] = tstypescript.language_typescript()
            lang_map["tsx"] = tstypescript.language_tsx()
        except AttributeError:
            lang_map["typescript"] = tstypescript.language()

        for name, lang in lang_map.items():
            language = Language(lang)
            self._languages[name] = language
            parser = Parser(language)
            self._parsers[name] = parser

    def detect_language(self, file_path: str) -> str | None:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".tsx":
            return "typescript"
        for lang, exts in self.SUPPORTED_LANGUAGES.items():
            if ext in exts:
                return lang
        return None

    def parse_file(self, file_path: str) -> ParsedFile:
        language = self.detect_language(file_path)
        if language is None:
            raise ValueError(f"Unsupported file type: {file_path}")

        with open(file_path, "rb") as f:
            source_bytes = f.read()

        parser_key = "tsx" if file_path.endswith(".tsx") and "tsx" in self._parsers else language
        parser = self._parsers.get(parser_key, self._parsers[language])
        tree = parser.parse(source_bytes)
        last_modified = os.path.getmtime(file_path)

        functions: list[ParsedFunction] = []
        classes: list[ParsedClass] = []
        imports: list[str] = []

        self._walk_node(
            tree.root_node, source_bytes, language, file_path, functions, classes, imports
        )

        # Deduplicate by name: when the tree walker and the error-fallback both add the
        # same function, keep whichever entry has a docstring.
        if language in ("javascript", "typescript"):
            seen: dict[str, int] = {}
            deduped: list[ParsedFunction] = []
            for func in functions:
                key = func.name
                if key in seen:
                    existing = deduped[seen[key]]
                    if func.existing_docstring and not existing.existing_docstring:
                        deduped[seen[key]] = func
                else:
                    seen[key] = len(deduped)
                    deduped.append(func)
            functions = deduped

        return ParsedFile(
            path=file_path,
            language=language,
            functions=functions,
            classes=classes,
            imports=imports,
            last_modified=last_modified,
        )

    def _walk_node(
        self,
        node: Node,
        source: bytes,
        language: str,
        file_path: str,
        functions: list[ParsedFunction],
        classes: list[ParsedClass],
        imports: list[str],
        parent_class: ParsedClass | None = None,
    ) -> None:
        if language == "python":
            self._walk_python(node, source, file_path, functions, classes, imports, parent_class)
        elif language in ("javascript", "typescript"):
            self._walk_js_ts(
                node, source, language, file_path, functions, classes, imports, parent_class
            )
        elif language == "java":
            self._walk_java(node, source, file_path, functions, classes, imports, parent_class)
        elif language == "go":
            self._walk_go(node, source, file_path, functions, classes, imports)
        elif language == "rust":
            self._walk_rust(node, source, file_path, functions, classes, imports)

    def _walk_python(
        self,
        node: Node,
        source: bytes,
        file_path: str,
        functions: list[ParsedFunction],
        classes: list[ParsedClass],
        imports: list[str],
        parent_class: ParsedClass | None = None,
    ) -> None:
        for child in node.children:
            if child.type == "import_statement" or child.type == "import_from_statement":
                imports.append(
                    source[child.start_byte : child.end_byte].decode("utf-8", errors="replace")
                )
            elif child.type in ("function_definition", "decorated_definition"):
                func = self._parse_python_function(child, source, file_path)
                if func:
                    if parent_class:
                        parent_class.methods.append(func)
                    else:
                        functions.append(func)
            elif child.type == "class_definition":
                cls = self._parse_python_class(child, source, file_path, functions, imports)
                classes.append(cls)
            else:
                self._walk_python(
                    child, source, file_path, functions, classes, imports, parent_class
                )

    def _parse_python_function(
        self, node: Node, source: bytes, file_path: str
    ) -> ParsedFunction | None:
        decorators: list[str] = []
        actual_node = node

        if node.type == "decorated_definition":
            for child in node.children:
                if child.type == "decorator":
                    decorators.append(
                        source[child.start_byte : child.end_byte].decode("utf-8", errors="replace")
                    )
                elif child.type == "function_definition":
                    actual_node = child
                    break

        if actual_node.type != "function_definition":
            return None

        name_node = actual_node.child_by_field_name("name")
        if not name_node:
            return None
        name = source[name_node.start_byte : name_node.end_byte].decode("utf-8", errors="replace")

        is_async = any(c.type == "async" for c in actual_node.children)
        params = self._extract_python_params(actual_node, source)
        return_type = self._extract_python_return_type(actual_node, source)
        docstring = self._extract_python_docstring(actual_node, source)
        func_source = source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")

        return ParsedFunction(
            name=name,
            language="python",
            file_path=file_path,
            start_byte=node.start_byte,
            end_byte=node.end_byte,
            start_line=node.start_point[0],
            end_line=node.end_point[0],
            source=func_source,
            existing_docstring=docstring,
            parameters=params,
            return_type=return_type,
            is_async=is_async,
            decorators=decorators,
        )

    def _extract_python_params(self, func_node: Node, source: bytes) -> list[dict[str, Any]]:
        params: list[dict[str, Any]] = []
        params_node = func_node.child_by_field_name("parameters")
        if not params_node:
            return params

        for child in params_node.children:
            if child.type in (
                "identifier",
                "typed_parameter",
                "default_parameter",
                "typed_default_parameter",
                "list_splat_pattern",
                "dictionary_splat_pattern",
            ):
                param: dict[str, Any] = {"name": "", "type_annotation": None}
                if child.type == "identifier":
                    param["name"] = source[child.start_byte : child.end_byte].decode(
                        "utf-8", errors="replace"
                    )
                elif child.type in ("typed_parameter", "typed_default_parameter"):
                    name_n = child.child_by_field_name("name") or (
                        child.children[0] if child.children else None
                    )
                    type_n = child.child_by_field_name("type")
                    if name_n:
                        param["name"] = source[name_n.start_byte : name_n.end_byte].decode(
                            "utf-8", errors="replace"
                        )
                    if type_n:
                        param["type_annotation"] = source[
                            type_n.start_byte : type_n.end_byte
                        ].decode("utf-8", errors="replace")
                elif child.type == "default_parameter":
                    name_n = child.child_by_field_name("name")
                    if name_n:
                        param["name"] = source[name_n.start_byte : name_n.end_byte].decode(
                            "utf-8", errors="replace"
                        )
                elif child.type in ("list_splat_pattern", "dictionary_splat_pattern"):
                    param["name"] = source[child.start_byte : child.end_byte].decode(
                        "utf-8", errors="replace"
                    )
                if param["name"] and param["name"] not in ("self", "cls"):
                    params.append(param)
        return params

    def _extract_python_return_type(self, func_node: Node, source: bytes) -> str | None:
        ret_node = func_node.child_by_field_name("return_type")
        if ret_node:
            return (
                source[ret_node.start_byte : ret_node.end_byte]
                .decode("utf-8", errors="replace")
                .lstrip("->")
                .strip()
            )
        return None

    def _extract_python_docstring(self, func_node: Node, source: bytes) -> str | None:
        body = func_node.child_by_field_name("body")
        if not body:
            return None
        for child in body.children:
            if child.type == "expression_statement":
                for sub in child.children:
                    if sub.type in ("string", "concatenated_string"):
                        raw = source[sub.start_byte : sub.end_byte].decode(
                            "utf-8", errors="replace"
                        )
                        return raw.strip('"""').strip("'''").strip('"').strip("'").strip()
        return None

    def _parse_python_class(
        self,
        node: Node,
        source: bytes,
        file_path: str,
        top_functions: list[ParsedFunction],
        imports: list[str],
    ) -> ParsedClass:
        name_node = node.child_by_field_name("name")
        name = (
            source[name_node.start_byte : name_node.end_byte].decode("utf-8", errors="replace")
            if name_node
            else "Unknown"
        )
        docstring = None
        methods: list[ParsedFunction] = []

        body = node.child_by_field_name("body")
        if body:
            for child in body.children:
                if child.type == "expression_statement":
                    for sub in child.children:
                        if sub.type == "string" and docstring is None:
                            raw = source[sub.start_byte : sub.end_byte].decode(
                                "utf-8", errors="replace"
                            )
                            docstring = raw.strip('"""').strip("'''").strip('"').strip("'").strip()
                elif child.type in ("function_definition", "decorated_definition"):
                    func = self._parse_python_function(child, source, file_path)
                    if func:
                        methods.append(func)

        cls_source = source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")
        return ParsedClass(
            name=name,
            language="python",
            file_path=file_path,
            start_byte=node.start_byte,
            end_byte=node.end_byte,
            start_line=node.start_point[0],
            end_line=node.end_point[0],
            source=cls_source,
            methods=methods,
            docstring=docstring,
        )

    def _walk_js_ts(
        self,
        node: Node,
        source: bytes,
        language: str,
        file_path: str,
        functions: list[ParsedFunction],
        classes: list[ParsedClass],
        imports: list[str],
        parent_class: ParsedClass | None = None,
    ) -> None:
        # When the node itself is an ERROR (e.g. tree-sitter failed on the whole file),
        # apply regex fallback to recover named function declarations with JSDoc.
        if node.type == "ERROR":
            self._js_error_regex_fallback(node, source, language, file_path, functions)

        for child in node.children:
            if child.type in ("import_statement", "import_declaration"):
                imports.append(
                    source[child.start_byte : child.end_byte].decode("utf-8", errors="replace")
                )
            elif child.type in (
                "function_declaration",
                "function_expression",
                "arrow_function",
                "method_definition",
                "generator_function_declaration",
            ):
                func = self._parse_js_function(child, source, language, file_path)
                if func:
                    if parent_class:
                        parent_class.methods.append(func)
                    else:
                        functions.append(func)
            elif child.type in ("lexical_declaration", "variable_declaration"):
                # Handle const foo = () => {} or const foo = function() {}
                for decl in child.children:
                    if decl.type == "variable_declarator":
                        value = decl.child_by_field_name("value")
                        if value and value.type in ("arrow_function", "function_expression"):
                            func = self._parse_js_function(decl, source, language, file_path, value)
                            if func:
                                if parent_class:
                                    parent_class.methods.append(func)
                                else:
                                    functions.append(func)
            elif child.type == "class_declaration":
                cls = self._parse_js_class(child, source, language, file_path, functions, imports)
                classes.append(cls)
            elif child.type == "export_statement":
                self._walk_js_ts(
                    child, source, language, file_path, functions, classes, imports, parent_class
                )
            elif child.type == "ERROR":
                # tree-sitter parse error — walk normally then apply regex fallback
                # to catch named function declarations that got broken into tokens.
                self._walk_js_ts(
                    child, source, language, file_path, functions, classes, imports, parent_class
                )
                self._js_error_regex_fallback(child, source, language, file_path, functions)
            else:
                self._walk_js_ts(
                    child, source, language, file_path, functions, classes, imports, parent_class
                )

    def _js_error_regex_fallback(
        self,
        error_node,
        source: bytes,
        language: str,
        file_path: str,
        functions: list,
    ) -> None:
        import re as _re

        region = source[error_node.start_byte : error_node.end_byte].decode(
            "utf-8", errors="replace"
        )

        # Find named function declarations at line start only (prevents matching
        # "function declaration (" inside JSX text / string literals).
        func_pattern = _re.compile(
            r"^[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*\(",
            _re.MULTILINE,
        )

        for m in func_pattern.finditer(region):
            name = m.group(1)
            if not name:
                continue

            # Look BACKWARDS from the function keyword to find the JSDoc block that
            # immediately precedes it (stripping only whitespace between */ and function).
            text_before = region[: m.start()]
            stripped = text_before.rstrip()
            docstring = None
            if stripped.endswith("*/"):
                jsdoc_start = stripped.rfind("/**")
                if jsdoc_start >= 0:
                    docstring = stripped[jsdoc_start:]

            # Compute position of the function keyword itself (not the JSDoc start)
            char_offset = m.start()
            start_line = error_node.start_point[0] + region[:char_offset].count("\n")
            abs_byte = error_node.start_byte + len(
                region[:char_offset].encode("utf-8", errors="replace")
            )
            is_async = bool(_re.search(r"\basync\b", region[max(0, m.start() - 20) : m.start()]))
            func_src = region[char_offset : char_offset + 500]

            # Check if this function was already added by the tree walker (without docstring).
            # If so and we now have a docstring, upgrade that entry; otherwise skip duplicates.
            existing_idx = next(
                (i for i, f in enumerate(functions) if f.name == name and f.file_path == file_path),
                -1,
            )
            if existing_idx >= 0:
                if docstring and not functions[existing_idx].existing_docstring:
                    # Upgrade the existing entry with the docstring we found
                    old = functions[existing_idx]
                    functions[existing_idx] = ParsedFunction(
                        name=old.name,
                        language=old.language,
                        file_path=old.file_path,
                        start_byte=old.start_byte,
                        end_byte=old.end_byte,
                        start_line=old.start_line,
                        end_line=old.end_line,
                        source=old.source,
                        existing_docstring=docstring,
                        parameters=old.parameters,
                        return_type=old.return_type,
                        is_async=old.is_async,
                        decorators=old.decorators,
                    )
                continue  # already in list, no need to add

            functions.append(
                ParsedFunction(
                    name=name,
                    language=language,
                    file_path=file_path,
                    start_byte=abs_byte,
                    end_byte=error_node.end_byte,
                    start_line=start_line,
                    end_line=error_node.end_point[0],
                    source=func_src,
                    existing_docstring=docstring,
                    parameters=[],
                    return_type=None,
                    is_async=is_async,
                    decorators=[],
                )
            )

    def _parse_js_function(
        self,
        node: Node,
        source: bytes,
        language: str,
        file_path: str,
        body_node: Node | None = None,
    ) -> ParsedFunction | None:
        actual = body_node if body_node else node
        is_async = False
        name = ""

        if node.type == "variable_declarator":
            name_n = node.child_by_field_name("name")
            name = (
                source[name_n.start_byte : name_n.end_byte].decode("utf-8", errors="replace")
                if name_n
                else ""
            )
            is_async = actual.type == "arrow_function" and any(
                c.type == "async" for c in node.parent.children if node.parent
            )
        elif node.type in ("function_declaration", "generator_function_declaration"):
            name_n = node.child_by_field_name("name")
            name = (
                source[name_n.start_byte : name_n.end_byte].decode("utf-8", errors="replace")
                if name_n
                else ""
            )
            is_async = any(c.type == "async" for c in node.children)
        elif node.type == "method_definition":
            name_n = node.child_by_field_name("name")
            name = (
                source[name_n.start_byte : name_n.end_byte].decode("utf-8", errors="replace")
                if name_n
                else ""
            )
            is_async = any(c.type == "async" for c in node.children)
        elif node.type in ("function_expression", "arrow_function"):
            name_n = node.child_by_field_name("name")
            name = (
                source[name_n.start_byte : name_n.end_byte].decode("utf-8", errors="replace")
                if name_n
                else "<anonymous>"
            )
            is_async = any(c.type == "async" for c in node.children)

        if not name:
            return None

        params = self._extract_js_params(actual if actual != node else node, source)
        docstring = self._extract_js_docstring(node, source)
        return_type = self._extract_js_return_type(actual if actual != node else node, source)
        func_source = source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")

        return ParsedFunction(
            name=name,
            language=language,
            file_path=file_path,
            start_byte=node.start_byte,
            end_byte=node.end_byte,
            start_line=node.start_point[0],
            end_line=node.end_point[0],
            source=func_source,
            existing_docstring=docstring,
            parameters=params,
            return_type=return_type,
            is_async=is_async,
            decorators=[],
        )

    def _extract_js_params(self, node: Node, source: bytes) -> list[dict[str, Any]]:
        params: list[dict[str, Any]] = []
        params_node = node.child_by_field_name("parameters") or node.child_by_field_name(
            "parameter"
        )
        if not params_node:
            return params
        for child in params_node.children:
            if child.type in (
                "identifier",
                "required_parameter",
                "optional_parameter",
                "assignment_pattern",
                "rest_pattern",
            ):
                param: dict[str, Any] = {"name": "", "type_annotation": None}
                if child.type == "identifier":
                    param["name"] = source[child.start_byte : child.end_byte].decode(
                        "utf-8", errors="replace"
                    )
                elif child.type in ("required_parameter", "optional_parameter"):
                    pat = child.child_by_field_name("pattern")
                    type_ann = child.child_by_field_name("type")
                    if pat:
                        param["name"] = source[pat.start_byte : pat.end_byte].decode(
                            "utf-8", errors="replace"
                        )
                    if type_ann:
                        param["type_annotation"] = source[
                            type_ann.start_byte : type_ann.end_byte
                        ].decode("utf-8", errors="replace")
                elif child.type == "assignment_pattern":
                    left = child.child_by_field_name("left")
                    if left:
                        param["name"] = source[left.start_byte : left.end_byte].decode(
                            "utf-8", errors="replace"
                        )
                elif child.type == "rest_pattern":
                    param["name"] = source[child.start_byte : child.end_byte].decode(
                        "utf-8", errors="replace"
                    )
                if param["name"]:
                    params.append(param)
        return params

    def _extract_js_docstring(self, node: Node, source: bytes) -> str | None:
        # Walk up to 4 parent levels to find the JSDoc comment.
        # This handles all wrapping patterns:
        #   function foo()              → node.prev_named_sibling is the comment
        #   export function foo()       → export_statement.prev_named_sibling is the comment
        #   const foo = () =>           → lexical_declaration.prev_named_sibling is the comment
        #   export const foo = () =>    → export_statement > lexical_declaration > variable_declarator
        candidate = node
        for _ in range(4):
            prev = candidate.prev_named_sibling
            if prev and prev.type == "comment":
                comment = source[prev.start_byte : prev.end_byte].decode("utf-8", errors="replace")
                if comment.startswith("/**"):
                    return comment
            if candidate.parent is None:
                break
            candidate = candidate.parent
        return None

    def _extract_js_return_type(self, node: Node, source: bytes) -> str | None:
        ret = node.child_by_field_name("return_type")
        if ret:
            return (
                source[ret.start_byte : ret.end_byte]
                .decode("utf-8", errors="replace")
                .lstrip(":")
                .strip()
            )
        return None

    def _parse_js_class(
        self,
        node: Node,
        source: bytes,
        language: str,
        file_path: str,
        top_functions: list[ParsedFunction],
        imports: list[str],
    ) -> ParsedClass:
        name_n = node.child_by_field_name("name")
        name = (
            source[name_n.start_byte : name_n.end_byte].decode("utf-8", errors="replace")
            if name_n
            else "Unknown"
        )
        methods: list[ParsedFunction] = []

        body = node.child_by_field_name("body")
        if body:
            for child in body.children:
                if child.type == "method_definition":
                    func = self._parse_js_function(child, source, language, file_path)
                    if func:
                        methods.append(func)

        cls_source = source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")
        return ParsedClass(
            name=name,
            language=language,
            file_path=file_path,
            start_byte=node.start_byte,
            end_byte=node.end_byte,
            start_line=node.start_point[0],
            end_line=node.end_point[0],
            source=cls_source,
            methods=methods,
        )

    def _walk_java(
        self,
        node: Node,
        source: bytes,
        file_path: str,
        functions: list[ParsedFunction],
        classes: list[ParsedClass],
        imports: list[str],
        parent_class: ParsedClass | None = None,
    ) -> None:
        for child in node.children:
            if child.type == "import_declaration":
                imports.append(
                    source[child.start_byte : child.end_byte].decode("utf-8", errors="replace")
                )
            elif child.type in ("class_declaration", "interface_declaration", "enum_declaration"):
                cls = self._parse_java_class(child, source, file_path, functions, imports)
                classes.append(cls)
            elif child.type == "method_declaration":
                func = self._parse_java_method(child, source, file_path)
                if func:
                    if parent_class:
                        parent_class.methods.append(func)
                    else:
                        functions.append(func)
            else:
                self._walk_java(child, source, file_path, functions, classes, imports, parent_class)

    def _parse_java_method(
        self, node: Node, source: bytes, file_path: str
    ) -> ParsedFunction | None:
        name_n = node.child_by_field_name("name")
        if not name_n:
            return None
        name = source[name_n.start_byte : name_n.end_byte].decode("utf-8", errors="replace")
        params = self._extract_java_params(node, source)
        return_type_n = node.child_by_field_name("type")
        return_type = (
            source[return_type_n.start_byte : return_type_n.end_byte].decode(
                "utf-8", errors="replace"
            )
            if return_type_n
            else None
        )
        docstring = self._extract_java_javadoc(node, source)
        func_source = source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")

        return ParsedFunction(
            name=name,
            language="java",
            file_path=file_path,
            start_byte=node.start_byte,
            end_byte=node.end_byte,
            start_line=node.start_point[0],
            end_line=node.end_point[0],
            source=func_source,
            existing_docstring=docstring,
            parameters=params,
            return_type=return_type,
            is_async=False,
            decorators=[],
        )

    def _extract_java_params(self, node: Node, source: bytes) -> list[dict[str, Any]]:
        params: list[dict[str, Any]] = []
        params_node = node.child_by_field_name("parameters")
        if not params_node:
            return params
        for child in params_node.children:
            if child.type == "formal_parameter":
                param: dict[str, Any] = {"name": "", "type_annotation": None}
                name_n = child.child_by_field_name("name")
                type_n = child.child_by_field_name("type")
                if name_n:
                    param["name"] = source[name_n.start_byte : name_n.end_byte].decode(
                        "utf-8", errors="replace"
                    )
                if type_n:
                    param["type_annotation"] = source[type_n.start_byte : type_n.end_byte].decode(
                        "utf-8", errors="replace"
                    )
                if param["name"]:
                    params.append(param)
        return params

    def _extract_java_javadoc(self, node: Node, source: bytes) -> str | None:
        prev = node.prev_named_sibling
        if prev and prev.type in ("block_comment", "line_comment"):
            comment = source[prev.start_byte : prev.end_byte].decode("utf-8", errors="replace")
            if comment.startswith("/**"):
                return comment
        return None

    def _parse_java_class(
        self,
        node: Node,
        source: bytes,
        file_path: str,
        top_functions: list[ParsedFunction],
        imports: list[str],
    ) -> ParsedClass:
        name_n = node.child_by_field_name("name")
        name = (
            source[name_n.start_byte : name_n.end_byte].decode("utf-8", errors="replace")
            if name_n
            else "Unknown"
        )
        methods: list[ParsedFunction] = []

        body = node.child_by_field_name("body")
        if body:
            for child in body.children:
                if child.type == "method_declaration":
                    func = self._parse_java_method(child, source, file_path)
                    if func:
                        methods.append(func)

        cls_source = source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")
        return ParsedClass(
            name=name,
            language="java",
            file_path=file_path,
            start_byte=node.start_byte,
            end_byte=node.end_byte,
            start_line=node.start_point[0],
            end_line=node.end_point[0],
            source=cls_source,
            methods=methods,
        )

    def _walk_go(
        self,
        node: Node,
        source: bytes,
        file_path: str,
        functions: list[ParsedFunction],
        classes: list[ParsedClass],
        imports: list[str],
    ) -> None:
        for child in node.children:
            if child.type == "import_declaration":
                imports.append(
                    source[child.start_byte : child.end_byte].decode("utf-8", errors="replace")
                )
            elif child.type == "function_declaration":
                func = self._parse_go_function(child, source, file_path)
                if func:
                    functions.append(func)
            elif child.type == "method_declaration":
                func = self._parse_go_function(child, source, file_path)
                if func:
                    functions.append(func)
            else:
                self._walk_go(child, source, file_path, functions, classes, imports)

    def _parse_go_function(
        self, node: Node, source: bytes, file_path: str
    ) -> ParsedFunction | None:
        name_n = node.child_by_field_name("name")
        if not name_n:
            return None
        name = source[name_n.start_byte : name_n.end_byte].decode("utf-8", errors="replace")
        params = self._extract_go_params(node, source)
        result_n = node.child_by_field_name("result")
        return_type = (
            source[result_n.start_byte : result_n.end_byte].decode("utf-8", errors="replace")
            if result_n
            else None
        )
        docstring = self._extract_go_doc(node, source)
        func_source = source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")

        return ParsedFunction(
            name=name,
            language="go",
            file_path=file_path,
            start_byte=node.start_byte,
            end_byte=node.end_byte,
            start_line=node.start_point[0],
            end_line=node.end_point[0],
            source=func_source,
            existing_docstring=docstring,
            parameters=params,
            return_type=return_type,
            is_async=False,
            decorators=[],
        )

    def _extract_go_params(self, node: Node, source: bytes) -> list[dict[str, Any]]:
        params: list[dict[str, Any]] = []
        params_n = node.child_by_field_name("parameters")
        if not params_n:
            return params
        for child in params_n.children:
            if child.type == "parameter_declaration":
                type_n = child.child_by_field_name("type")
                names = [c for c in child.children if c.type == "identifier"]
                for name_n in names:
                    params.append(
                        {
                            "name": source[name_n.start_byte : name_n.end_byte].decode(
                                "utf-8", errors="replace"
                            ),
                            "type_annotation": source[type_n.start_byte : type_n.end_byte].decode(
                                "utf-8", errors="replace"
                            )
                            if type_n
                            else None,
                        }
                    )
        return params

    def _extract_go_doc(self, node: Node, source: bytes) -> str | None:
        prev = node.prev_named_sibling
        if prev and prev.type == "comment":
            return source[prev.start_byte : prev.end_byte].decode("utf-8", errors="replace")
        return None

    def _walk_rust(
        self,
        node: Node,
        source: bytes,
        file_path: str,
        functions: list[ParsedFunction],
        classes: list[ParsedClass],
        imports: list[str],
    ) -> None:
        for child in node.children:
            if child.type == "use_declaration":
                imports.append(
                    source[child.start_byte : child.end_byte].decode("utf-8", errors="replace")
                )
            elif child.type == "function_item":
                func = self._parse_rust_function(child, source, file_path)
                if func:
                    functions.append(func)
            elif child.type == "impl_item":
                for impl_child in child.children:
                    if impl_child.type == "function_item":
                        func = self._parse_rust_function(impl_child, source, file_path)
                        if func:
                            functions.append(func)
            else:
                self._walk_rust(child, source, file_path, functions, classes, imports)

    def _parse_rust_function(
        self, node: Node, source: bytes, file_path: str
    ) -> ParsedFunction | None:
        name_n = node.child_by_field_name("name")
        if not name_n:
            return None
        name = source[name_n.start_byte : name_n.end_byte].decode("utf-8", errors="replace")
        is_async = any(c.type == "async" for c in node.children)
        params = self._extract_rust_params(node, source)
        ret_type_n = node.child_by_field_name("return_type")
        return_type = (
            source[ret_type_n.start_byte : ret_type_n.end_byte]
            .decode("utf-8", errors="replace")
            .lstrip("->")
            .strip()
            if ret_type_n
            else None
        )
        docstring = self._extract_rust_doc(node, source)
        func_source = source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")

        return ParsedFunction(
            name=name,
            language="rust",
            file_path=file_path,
            start_byte=node.start_byte,
            end_byte=node.end_byte,
            start_line=node.start_point[0],
            end_line=node.end_point[0],
            source=func_source,
            existing_docstring=docstring,
            parameters=params,
            return_type=return_type,
            is_async=is_async,
            decorators=[],
        )

    def _extract_rust_params(self, node: Node, source: bytes) -> list[dict[str, Any]]:
        params: list[dict[str, Any]] = []
        params_n = node.child_by_field_name("parameters")
        if not params_n:
            return params
        for child in params_n.children:
            if child.type == "parameter":
                pat = child.child_by_field_name("pattern")
                type_n = child.child_by_field_name("type")
                if pat:
                    params.append(
                        {
                            "name": source[pat.start_byte : pat.end_byte].decode(
                                "utf-8", errors="replace"
                            ),
                            "type_annotation": source[type_n.start_byte : type_n.end_byte].decode(
                                "utf-8", errors="replace"
                            )
                            if type_n
                            else None,
                        }
                    )
        return params

    def _extract_rust_doc(self, node: Node, source: bytes) -> str | None:
        prev = node.prev_named_sibling
        if prev and prev.type in ("line_comment", "block_comment"):
            comment = source[prev.start_byte : prev.end_byte].decode("utf-8", errors="replace")
            if comment.startswith("///"):
                return comment
        return None

    def extract_docstring(self, node: Node, language: str) -> str | None:
        raise NotImplementedError("Use parse_file which calls language-specific extractors")

    _DEFAULT_EXCLUDE = {
        ".git",
        ".svn",
        ".hg",
        "__pycache__",
        ".venv",
        "venv",
        "env",
        ".env",
        ".tox",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        ".eggs",
        "site-packages",
        "htmlcov",
        "node_modules",
        "bower_components",
        "dist",
        "build",
        "out",
        "output",
        ".next",
        ".nuxt",
        "_build",
        ".build",
        "target",
        "bin",
        "obj",
        "pkg",
        ".gradle",
        ".mvn",
        ".cargo",
        "vendor",
        ".idea",
        ".vscode",
        "coverage",
        "lcov-report",
        "tmp",
        "temp",
        ".tmp",
        "logs",
        ".cache",
        "tests",
        "test",
        "spec",
        "specs",
        "__tests__",
    }

    def parse_directory(self, dir_path: str, exclude: list[str] | None = None) -> list[ParsedFile]:
        exclude_set = self._DEFAULT_EXCLUDE | (set(exclude) if exclude else set())
        parsed: list[ParsedFile] = []

        for root, dirs, files in os.walk(dir_path):
            dirs[:] = [d for d in dirs if d not in exclude_set]
            for filename in files:
                file_path = os.path.join(root, filename)
                lang = self.detect_language(file_path)
                if lang:
                    try:
                        parsed.append(self.parse_file(file_path))
                    except Exception:
                        pass
        return parsed
