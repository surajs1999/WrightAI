"""Tests for tree-sitter parser."""

from __future__ import annotations


import pytest

from core.parser.tree_sitter_parser import CodeParser


@pytest.fixture
def parser() -> CodeParser:
    return CodeParser()


def test_detect_language_by_extension(parser: CodeParser) -> None:
    assert parser.detect_language("foo.py") == "python"
    assert parser.detect_language("bar.js") == "javascript"
    assert parser.detect_language("baz.ts") == "typescript"
    assert parser.detect_language("App.tsx") == "typescript"
    assert parser.detect_language("Main.java") == "java"
    assert parser.detect_language("main.go") == "go"
    assert parser.detect_language("lib.rs") == "rust"
    assert parser.detect_language("readme.md") is None


def test_parse_python_function_with_docstring(parser: CodeParser, sample_py_path: str) -> None:
    pf = parser.parse_file(sample_py_path)
    assert pf.language == "python"
    add_func = next((f for f in pf.functions if f.name == "add_numbers"), None)
    assert add_func is not None
    assert add_func.existing_docstring is not None
    assert "Add two numbers" in add_func.existing_docstring
    assert add_func.return_type is not None
    assert "int" in add_func.return_type
    assert len(add_func.parameters) == 2
    param_names = [p["name"] for p in add_func.parameters]
    assert "a" in param_names
    assert "b" in param_names


def test_parse_python_function_without_docstring(parser: CodeParser, sample_py_path: str) -> None:
    pf = parser.parse_file(sample_py_path)
    undoc = next((f for f in pf.functions if f.name == "undocumented_function"), None)
    assert undoc is not None
    assert undoc.existing_docstring is None
    param_names = [p["name"] for p in undoc.parameters]
    assert "x" in param_names
    assert "y" in param_names


def test_parse_python_async_function(parser: CodeParser, sample_py_path: str) -> None:
    pf = parser.parse_file(sample_py_path)
    async_func = next((f for f in pf.functions if f.name == "async_fetch"), None)
    assert async_func is not None
    assert async_func.is_async is True
    assert async_func.existing_docstring is not None


def test_parse_javascript_function(parser: CodeParser, sample_js_path: str) -> None:
    pf = parser.parse_file(sample_js_path)
    assert pf.language == "javascript"
    greet = next((f for f in pf.functions if f.name == "greet"), None)
    assert greet is not None
    assert greet.existing_docstring is not None
    assert "Greet" in greet.existing_docstring


def test_parse_typescript_async_function(parser: CodeParser, sample_ts_path: str) -> None:
    pf = parser.parse_file(sample_ts_path)
    assert pf.language == "typescript"
    fetch_user = next((f for f in pf.functions if f.name == "fetchUser"), None)
    assert fetch_user is not None
    assert fetch_user.is_async is True


def test_parse_directory(parser: CodeParser, temp_dir_with_py: str) -> None:
    parsed = parser.parse_directory(temp_dir_with_py)
    assert len(parsed) == 2
    all_funcs = [f for pf in parsed for f in pf.functions]
    names = [f.name for f in all_funcs]
    assert "func_a" in names
    assert "func_b" in names


def test_parse_python_class(parser: CodeParser, sample_py_path: str) -> None:
    pf = parser.parse_file(sample_py_path)
    calc = next((c for c in pf.classes if c.name == "Calculator"), None)
    assert calc is not None
    assert calc.docstring is not None
    method_names = [m.name for m in calc.methods]
    assert "multiply" in method_names
    assert "divide" in method_names
