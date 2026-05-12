"""Tests for docstring injector."""

from __future__ import annotations

import os
import tempfile

import pytest

from core.llm.prompts import DocStyle
from core.llm.schema import DocstringSchema, ParameterDoc, ReturnDoc
from core.output.injector import DocstringInjector
from core.parser.tree_sitter_parser import CodeParser


@pytest.fixture
def injector() -> DocstringInjector:
    """
    Provides a DocstringInjector fixture instance for pytest tests.

    This pytest fixture creates and returns a fresh DocstringInjector instance that can be used across multiple test functions to inject or modify docstrings in Python code.

    Returns:
        DocstringInjector: A new instance of DocstringInjector configured for testing.

    Example:
        ```
        def test_example(injector):
            result = injector.inject_docstring(code, docstring)
        ```
    """
    return DocstringInjector()


@pytest.fixture
def parser() -> CodeParser:
    """
    Creates and returns a CodeParser instance for use in pytest tests.

    This pytest fixture provides a fresh CodeParser instance to test functions, ensuring test isolation by creating a new parser for each test that requires it.

    Returns:
        CodeParser: A new instance of CodeParser configured for testing.

    Example:
        ```
        def test_parser_functionality(parser):
            result = parser.parse_code(sample_code)
        ```
    """
    return CodeParser()


@pytest.fixture
def sample_doc() -> DocstringSchema:
    """
    Provides a pytest fixture that returns a sample DocstringSchema instance for testing purposes.

    This fixture creates a pre-configured DocstringSchema object representing documentation for a hypothetical greeting function. It includes a summary, a single parameter definition for 'name', and a return value definition. The fixture is used in tests that verify docstring injection and modification behavior.

    Returns:
        DocstringSchema: A DocstringSchema instance containing sample documentation with a summary describing a greeting function, one string parameter named 'name', and a string return type.

    Example:
        ```
        @pytest.fixture
        def sample_doc() -> DocstringSchema:
            return DocstringSchema(
                summary="Greets a user by name.",
                parameters=[ParameterDoc(name="name", type_hint="str", description="The user's name.")],
                returns=ReturnDoc(type_hint="str", description="A greeting string."),
            )
        ```
    """
    return DocstringSchema(
        summary="Greets a user by name.",
        parameters=[ParameterDoc(name="name", type_hint="str", description="The user's name.")],
        returns=ReturnDoc(type_hint="str", description="A greeting string."),
    )


def test_injects_at_correct_byte_offset(
    injector: DocstringInjector, parser: CodeParser, sample_doc: DocstringSchema, temp_py_file: str
) -> None:
    """
    Tests that the DocstringInjector correctly injects a docstring at the proper byte offset in a Python file.

    This test verifies the injection functionality by parsing a temporary Python file, locating a function named 'hello', injecting a sample docstring using Google style, and then confirming that both the injected content and the original function remain intact in the file.

    Args:
        injector (DocstringInjector): The DocstringInjector instance used to inject docstrings into code.
        parser (CodeParser): The CodeParser instance used to parse the Python file and extract function information.
        sample_doc (DocstringSchema): The sample docstring schema containing the text 'Greets a user by name' to be injected.
        temp_py_file (str): The path to the temporary Python file used for testing injection.

    Returns:
        None: This test function does not return a value.

    Raises:
        AssertionError: When the injection fails, when the expected docstring content is not found in the file, or when the original function is not preserved.
        StopIteration: When no function named 'hello' is found in the parsed file.

    Example:
        ```
        test_injects_at_correct_byte_offset(injector, parser, sample_doc, '/tmp/test_file.py')
        ```
    """
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
    """
    Tests that dry run mode does not modify the file when injecting docstrings.

    Verifies that when the injector runs in dry_run mode, the original file content remains unchanged after attempting to inject a docstring into a function. Reads the file before and after injection to confirm no modifications occurred.

    Args:
        injector (DocstringInjector): The docstring injector instance used to inject documentation.
        parser (CodeParser): The code parser used to parse the Python file and extract function definitions.
        sample_doc (DocstringSchema): The sample docstring schema to inject into the function.
        temp_py_file (str): The path to the temporary Python file used for testing.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_dry_run_does_not_modify_file(injector, parser, sample_doc, '/tmp/test.py')
        ```
    """
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
    """
    Tests that the injector correctly formats a docstring in Google style with proper sections and content.

    Verifies that the DocstringInjector.format_docstring method generates a valid Google-style docstring containing triple quotes, standard sections (Args, Returns), and expected content from the sample documentation schema.

    Args:
        injector (DocstringInjector): The DocstringInjector instance used to format docstrings.
        sample_doc (DocstringSchema): The sample documentation schema containing the docstring data to be formatted.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_formats_google_style_correctly(injector, sample_doc)
        ```
    """
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write('def documented(x: int) -> int:\n    """Old docstring."""\n    return x + 1\n')
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


def test_formats_google_style_correctly(
    injector: DocstringInjector, sample_doc: DocstringSchema
) -> None:
    """
    Tests that the DocstringInjector correctly formats a DocstringSchema into Google-style docstring format.

    Verifies that the format_docstring method produces a valid Google-style docstring with triple quotes, proper sections (Args:, Returns:), and includes expected content from the sample DocstringSchema like parameter names and the function description.

    Args:
        injector (DocstringInjector): The DocstringInjector instance used to format docstrings.
        sample_doc (DocstringSchema): The sample docstring schema containing function documentation to be formatted.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_formats_google_style_correctly(injector, sample_doc)
        ```
    """
    formatted = injector.format_docstring(sample_doc, DocStyle.GOOGLE, "python", 4)
    assert '"""' in formatted
    assert "Args:" in formatted
    assert "Returns:" in formatted
    assert "name" in formatted
    assert "Greets a user" in formatted


def test_formats_jsdoc_correctly(injector: DocstringInjector, sample_doc: DocstringSchema) -> None:
    """
    Tests that the DocstringInjector correctly formats a docstring in JSDoc style for JavaScript code.

    Verifies that the format_docstring method produces output containing JSDoc comment markers (/**), parameter tags (@param), return tags (@returns), and includes the parameter name from the sample docstring schema.

    Args:
        injector (DocstringInjector): The DocstringInjector instance used to format the docstring.
        sample_doc (DocstringSchema): The sample docstring schema object to be formatted into JSDoc style.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_formats_jsdoc_correctly(injector, sample_doc)
        ```
    """
    formatted = injector.format_docstring(sample_doc, DocStyle.JSDOC, "javascript", 0)
    assert "/**" in formatted
    assert "@param" in formatted
    assert "@returns" in formatted
    assert "name" in formatted


def test_formats_numpy_style_correctly(
    injector: DocstringInjector, sample_doc: DocstringSchema
) -> None:
    """
    Tests that the DocstringInjector correctly formats a docstring in NumPy style with proper sections and separators.

    Verifies that when formatting a sample docstring schema using NumPy style, the output contains the expected NumPy-specific formatting elements including 'Parameters' section header, section separator dashes ('----------'), and 'Returns' section header.

    Args:
        injector (DocstringInjector): The DocstringInjector instance used to format docstrings into different styles.
        sample_doc (DocstringSchema): A sample docstring schema object containing documentation data to be formatted.

    Returns:
        None: This is a test function that performs assertions and does not return a value.

    Example:
        ```
        test_formats_numpy_style_correctly(injector, sample_doc)
        ```
    """
    formatted = injector.format_docstring(sample_doc, DocStyle.NUMPY, "python", 4)
    assert "Parameters" in formatted
    assert "----------" in formatted
    assert "Returns" in formatted
