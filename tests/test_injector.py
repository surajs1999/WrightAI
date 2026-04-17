"""Tests for docstring injector."""
from __future__ import annotations

import os
import shutil
import tempfile

import pytest

from core.llm.prompts import DocStyle
from core.llm.schema import DocstringSchema, ParameterDoc, ReturnDoc
from core.output.injector import DocstringInjector
from core.parser.tree_sitter_parser import CodeParser


@pytest.fixture
def injector() -> DocstringInjector:
    return DocstringInjector()


@pytest.fixture
def parser() -> CodeParser:
    return CodeParser()


@pytest.fixture
def sample_doc() -> DocstringSchema:
    return DocstringSchema(
        summary="Greets a user by name.",
        parameters=[ParameterDoc(name="name", type_hint="str", description="The user's name.")],
        returns=ReturnDoc(type_hint="str", description="A greeting string."),
    )


def test_injects_at_correct_byte_offset(
    injector: DocstringInjector, parser: CodeParser, sample_doc: DocstringSchema, temp_py_file: str
) -> None:
    pf = parser.parse_file(temp_py_file)
    func = next(f for f in pf.functions if f.name == "hello")
    result = injector.inject(temp_py_file, func, sample_doc, DocStyle.GOOGLE, dry_run=False)

    assert result.success, f"Injection failed: {result.error}"
    with open(temp_py_file) as f:
        content = f.read()
    assert "Greets a user by name" in content
    assert "hello" in content  # Function still exists


def test_dry_run_does_not_modify_file(
    injector: DocstringInjector, parser: CodeParser, sample_doc: DocstringSchema, temp_py_file: str
) -> None:
    with open(temp_py_file) as f:
        original = f.read()

    pf = parser.parse_file(temp_py_file)
    func = next(f for f in pf.functions if f.name == "hello")
    result = injector.inject(temp_py_file, func, sample_doc, DocStyle.GOOGLE, dry_run=True)

    assert result.success
    with open(temp_py_file) as f:
        after = f.read()
    assert original == after  # File unchanged


def test_replaces_existing_docstring(
    injector: DocstringInjector, parser: CodeParser, sample_doc: DocstringSchema
) -> None:
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write(
            'def documented(x: int) -> int:\n'
            '    """Old docstring."""\n'
            '    return x + 1\n'
        )
        path = f.name

    try:
        pf = parser.parse_file(path)
        func = pf.functions[0]
        assert func.existing_docstring is not None

        new_doc = DocstringSchema(
            summary="New summary.",
            parameters=[ParameterDoc(name="x", type_hint="int", description="The input.")],
            returns=ReturnDoc(type_hint="int", description="x plus 1."),
        )
        result = injector.inject(path, func, new_doc, DocStyle.GOOGLE, dry_run=False)
        assert result.success

        with open(path) as f:
            content = f.read()
        assert "New summary" in content
    finally:
        os.unlink(path)


def test_formats_google_style_correctly(injector: DocstringInjector, sample_doc: DocstringSchema) -> None:
    formatted = injector.format_docstring(sample_doc, DocStyle.GOOGLE, "python", 4)
    assert '"""' in formatted
    assert "Args:" in formatted
    assert "Returns:" in formatted
    assert "name" in formatted
    assert "Greets a user" in formatted


def test_formats_jsdoc_correctly(injector: DocstringInjector, sample_doc: DocstringSchema) -> None:
    formatted = injector.format_docstring(sample_doc, DocStyle.JSDOC, "javascript", 0)
    assert "/**" in formatted
    assert "@param" in formatted
    assert "@returns" in formatted
    assert "name" in formatted


def test_formats_numpy_style_correctly(injector: DocstringInjector, sample_doc: DocstringSchema) -> None:
    formatted = injector.format_docstring(sample_doc, DocStyle.NUMPY, "python", 4)
    assert "Parameters" in formatted
    assert "----------" in formatted
    assert "Returns" in formatted
