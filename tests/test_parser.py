"""Tests for tree-sitter parser."""

from __future__ import annotations


import pytest

from core.parser.tree_sitter_parser import CodeParser


@pytest.fixture
def parser() -> CodeParser:
    """
    Creates and returns a CodeParser fixture instance for use in pytest test cases.

    This pytest fixture provides a fresh CodeParser instance to test functions, ensuring test isolation by creating a new parser for each test that requests it.

    Returns:
        CodeParser: A new instance of the CodeParser class for parsing Python code.

    Example:
        ```
        def test_something(parser):
            result = parser.parse_file('example.py')
        ```
    """
    return CodeParser()


def test_detect_language_by_extension(parser: CodeParser) -> None:
    """
    Tests that the CodeParser correctly detects programming languages based on file extensions.

    Validates the language detection functionality by asserting that various file extensions (.py, .js, .ts, .tsx, .java, .go, .rs) map to their corresponding language identifiers, and that unsupported extensions (like .md) return None.

    Args:
        parser (CodeParser): The CodeParser instance used to test language detection functionality.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_detect_language_by_extension(parser)
        ```
    """
    assert parser.detect_language("foo.py") == "python"
    assert parser.detect_language("bar.js") == "javascript"
    assert parser.detect_language("baz.ts") == "typescript"
    assert parser.detect_language("App.tsx") == "typescript"
    assert parser.detect_language("Main.java") == "java"
    assert parser.detect_language("main.go") == "go"
    assert parser.detect_language("lib.rs") == "rust"
    assert parser.detect_language("readme.md") is None


def test_parse_python_function_with_docstring(parser: CodeParser, sample_py_path: str) -> None:
    """
    Tests that the parser correctly extracts function metadata including docstring, return type, and parameters from a Python file.

    Verifies that the CodeParser can parse a Python file and extract detailed information about a function named 'add_numbers', including its existing docstring content, return type annotation, and parameter list with correct names.

    Args:
        parser (CodeParser): The CodeParser instance used to parse Python source files.
        sample_py_path (str): The file path to a sample Python file containing a function with a docstring to be parsed.

    Returns:
        None: This test function does not return a value.

    Raises:
        AssertionError: When any of the assertions fail, such as if the parsed file language is not 'python', the 'add_numbers' function is not found, the docstring does not contain 'Add two numbers', the return type does not contain 'int', or the parameters are not correctly named 'a' and 'b'.

    Example:
        ```
        test_parse_python_function_with_docstring(parser, '/path/to/sample.py')
        ```
    """
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
    """
    Tests that the parser correctly extracts function information from a Python function that has no docstring.

    This test verifies that the CodeParser can parse a Python file and correctly identify a function named 'undocumented_function' that lacks a docstring. It asserts that the function exists, has no existing docstring, and that its parameters 'x' and 'y' are correctly extracted.

    Args:
        parser (CodeParser): The CodeParser instance used to parse Python source files.
        sample_py_path (str): The file path to the sample Python file containing the undocumented function to test.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_parse_python_function_without_docstring(parser, 'tests/samples/example.py')
        ```
    """
    pf = parser.parse_file(sample_py_path)
    undoc = next((f for f in pf.functions if f.name == "undocumented_function"), None)
    assert undoc is not None
    assert undoc.existing_docstring is None
    param_names = [p["name"] for p in undoc.parameters]
    assert "x" in param_names
    assert "y" in param_names


def test_parse_python_async_function(parser: CodeParser, sample_py_path: str) -> None:
    """
    Tests that the parser correctly identifies and extracts async function metadata from a Python file.

    Parses a sample Python file, locates the async function named 'async_fetch', and verifies that the parser correctly identifies it as an async function and extracts its existing docstring.

    Args:
        parser (CodeParser): The code parser instance used to parse Python files.
        sample_py_path (str): The file path to the sample Python file containing the async function to test.

    Returns:
        None: This function does not return a value; it performs assertions to validate parser behavior.

    Raises:
        AssertionError: When the async function 'async_fetch' is not found, when is_async is not True, or when the existing_docstring is None.

    Example:
        ```
        test_parse_python_async_function(code_parser, '/path/to/sample.py')
        ```
    """
    pf = parser.parse_file(sample_py_path)
    async_func = next((f for f in pf.functions if f.name == "async_fetch"), None)
    assert async_func is not None
    assert async_func.is_async is True
    assert async_func.existing_docstring is not None


def test_parse_javascript_function(parser: CodeParser, sample_js_path: str) -> None:
    """
    Tests the parsing of a JavaScript file to verify language detection and function docstring extraction.

    Validates that the CodeParser correctly identifies JavaScript code, extracts functions from the parsed file, and preserves existing docstrings. Specifically checks for a function named 'greet' and verifies its docstring contains the expected text.

    Args:
        parser (CodeParser): The code parser instance used to parse the JavaScript file.
        sample_js_path (str): The file path to the sample JavaScript file to be parsed and tested.

    Returns:
        None: This is a test function that performs assertions and returns nothing.

    Raises:
        AssertionError: When the parsed file language is not 'javascript', the 'greet' function is not found, or the docstring does not contain 'Greet'.

    Example:
        ```
        test_parse_javascript_function(parser, 'samples/example.js')
        ```
    """
    pf = parser.parse_file(sample_js_path)
    assert pf.language == "javascript"
    greet = next((f for f in pf.functions if f.name == "greet"), None)
    assert greet is not None
    assert greet.existing_docstring is not None
    assert "Greet" in greet.existing_docstring


def test_parse_typescript_async_function(parser: CodeParser, sample_ts_path: str) -> None:
    """
    Tests that the parser correctly identifies and parses an async function in a TypeScript file.

    This test verifies that the CodeParser can parse a TypeScript file and correctly detect that a function named 'fetchUser' is marked as async by checking the is_async attribute.

    Args:
        parser (CodeParser): An instance of CodeParser used to parse the TypeScript file.
        sample_ts_path (str): The file path to a sample TypeScript file containing an async function named 'fetchUser'.

    Returns:
        None: This function does not return a value; it performs assertions to validate parsing behavior.

    Raises:
        AssertionError: When the parsed file language is not 'typescript', the 'fetchUser' function is not found, or the function's is_async attribute is not True.

    Example:
        ```
        test_parse_typescript_async_function(parser_instance, '/path/to/sample.ts')
        ```
    """
    pf = parser.parse_file(sample_ts_path)
    assert pf.language == "typescript"
    fetch_user = next((f for f in pf.functions if f.name == "fetchUser"), None)
    assert fetch_user is not None
    assert fetch_user.is_async is True


def test_parse_directory(parser: CodeParser, temp_dir_with_py: str) -> None:
    """
    Tests that the CodeParser can parse a directory containing Python files and extract functions from them.

    This test function verifies that the parser correctly identifies and parses multiple Python files in a directory, extracting function definitions. It checks that exactly 2 parsed files are returned and that specific function names ('func_a' and 'func_b') are present in the collected functions.

    Args:
        parser (CodeParser): The CodeParser instance used to parse the directory and extract code elements.
        temp_dir_with_py (str): Path to a temporary directory containing Python files for testing purposes.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_parse_directory(parser, '/tmp/test_dir')
        ```
    """
    parsed = parser.parse_directory(temp_dir_with_py)
    assert len(parsed) == 2
    all_funcs = [f for pf in parsed for f in pf.functions]
    names = [f.name for f in all_funcs]
    assert "func_a" in names
    assert "func_b" in names


def test_parse_python_class(parser: CodeParser, sample_py_path: str) -> None:
    """
    Tests parsing of a Python class from a file by verifying that a Calculator class with multiply and divide methods is correctly extracted.

    This test function validates the CodeParser's ability to parse Python class definitions from a source file. It specifically checks that the Calculator class is found, has a docstring, and contains the expected multiply and divide methods.

    Args:
        parser (CodeParser): The CodeParser instance used to parse the Python source file.
        sample_py_path (str): The file path to the sample Python file containing the Calculator class to be parsed.

    Returns:
        None: This test function returns nothing; it asserts conditions or raises AssertionError on failure.

    Raises:
        AssertionError: When the Calculator class is not found, when its docstring is None, or when the multiply or divide methods are missing.
        StopIteration: When the next() function finds no matching Calculator class and no default value is provided (though default None is provided in this implementation).

    Example:
        ```
        test_parse_python_class(my_parser, '/path/to/sample.py')
        ```

    Complexity: O(n) time where n is the number of classes in the parsed file, O(1) space
    """
    pf = parser.parse_file(sample_py_path)
    calc = next((c for c in pf.classes if c.name == "Calculator"), None)
    assert calc is not None
    assert calc.docstring is not None
    method_names = [m.name for m in calc.methods]
    assert "multiply" in method_names
    assert "divide" in method_names
