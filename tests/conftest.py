"""Shared pytest fixtures."""

from __future__ import annotations

import os
import tempfile

import pytest

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
SAMPLE_PY = os.path.join(FIXTURES_DIR, "sample.py")
SAMPLE_JS = os.path.join(FIXTURES_DIR, "sample.js")
SAMPLE_TS = os.path.join(FIXTURES_DIR, "sample.ts")


@pytest.fixture
def sample_py_path() -> str:
    """
    Provides the file path to a sample Python file as a pytest fixture.

    This pytest fixture returns the constant SAMPLE_PY which contains the path to a sample Python file used for testing purposes throughout the test suite.

    Returns:
        str: The file path string pointing to the sample Python file (SAMPLE_PY constant).

    Example:
        ```
        def test_something(sample_py_path):
            with open(sample_py_path) as f:
                content = f.read()
        ```
    """
    return SAMPLE_PY


@pytest.fixture
def sample_js_path() -> str:
    """
    Provides the file path to the sample JavaScript file for testing purposes.

    This pytest fixture returns the path to SAMPLE_JS, which is used across multiple test functions to access a sample JavaScript file for testing JavaScript-related functionality.

    Returns:
        str: The file path to the sample JavaScript file (SAMPLE_JS constant).

    Example:
        ```
        def test_example(sample_js_path):
            with open(sample_js_path, 'r') as f:
                content = f.read()
        ```
    """
    return SAMPLE_JS


@pytest.fixture
def sample_ts_path() -> str:
    """
    Provides a pytest fixture that returns the path to a sample TypeScript file.

    This fixture is used in tests to provide a consistent reference to the SAMPLE_TS constant, which contains the file path to a sample TypeScript file used for testing purposes.

    Returns:
        str: The file path to the sample TypeScript file (SAMPLE_TS constant).

    Example:
        ```
        def test_something(sample_ts_path):
            assert os.path.exists(sample_ts_path)
        ```
    """
    return SAMPLE_TS


@pytest.fixture
def temp_py_file():
    """
    Creates a temporary Python file containing sample function definitions for testing purposes.

    This pytest fixture generates a temporary Python file with two example functions (hello and goodbye) that accept string parameters and return formatted strings. The file is automatically cleaned up after the test completes.

    Returns:
        Generator[str, None, None]: The file path to the temporary Python file as a string, yielded to the test function.

    Example:
        ```
        def test_example(temp_py_file):
            with open(temp_py_file, 'r') as f:
                content = f.read()
            assert 'def hello' in content
        ```
    """
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write(
            "def hello(name: str) -> str:\n"
            "    return f'Hello, {name}'\n\n"
            "def goodbye(name: str, formal: bool = False) -> str:\n"
            "    if formal:\n"
            "        return f'Goodbye, {name}.'\n"
            "    return f'Bye {name}!'\n"
        )
        path = f.name
    yield path
    os.unlink(path)


@pytest.fixture
def temp_dir_with_py():
    """
    Creates a temporary directory containing two sample Python module files for testing purposes.

    This pytest fixture generates a temporary directory with two Python files: module_a.py (containing a function that increments an integer) and module_b.py (containing a function that converts a string to uppercase). The fixture yields the temporary directory path and automatically cleans it up after the test completes.

    Returns:
        Generator[str, None, None]: A generator that yields the path to the temporary directory containing the two Python module files.

    Example:
        ```
        def test_example(temp_dir_with_py):
            files = os.listdir(temp_dir_with_py)
            assert 'module_a.py' in files
        ```
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        file1 = os.path.join(tmpdir, "module_a.py")
        file2 = os.path.join(tmpdir, "module_b.py")
        with open(file1, "w") as f:
            f.write("def func_a(x: int) -> int:\n    return x + 1\n")
        with open(file2, "w") as f:
            f.write("def func_b(y: str) -> str:\n    return y.upper()\n")
        yield tmpdir
