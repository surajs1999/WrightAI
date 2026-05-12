"""Tests for drift detector."""

from __future__ import annotations


import pytest

from core.drift.drift_detector import DriftDetector, DriftResult
from core.parser.cache import ASTCache
from core.parser.tree_sitter_parser import CodeParser, ParsedFunction


@pytest.fixture
def detector() -> DriftDetector:
    """
    Creates and returns a DriftDetector instance as a pytest fixture for testing.

    This pytest fixture provides a fresh DriftDetector instance for each test function that requests it, ensuring test isolation and consistent test setup.

    Returns:
        DriftDetector: A new instance of DriftDetector configured for testing.

    Example:
        ```
        def test_drift_detection(detector):
            result = detector.detect(data)
        ```
    """
    return DriftDetector()


@pytest.fixture
def parser() -> CodeParser:
    """
    Creates and returns a CodeParser instance for use in pytest test cases.

    This pytest fixture provides a fresh CodeParser instance to tests, ensuring test isolation by creating a new parser object for each test that requests it.

    Returns:
        CodeParser: A new instance of the CodeParser class.

    Example:
        ```
        def test_example(parser):
            result = parser.parse_code(source)
        ```
    """
    return CodeParser()


@pytest.fixture
def temp_cache(tmp_path) -> ASTCache:
    """
    Creates a temporary ASTCache instance for testing purposes using a test database file.

    This pytest fixture provides an isolated ASTCache instance that uses a temporary directory for storing its database file, ensuring test isolation and automatic cleanup after tests complete.

    Args:
        tmp_path (Path): Pytest fixture that provides a temporary directory path unique to the test invocation.

    Returns:
        ASTCache: An ASTCache instance configured with a temporary database file path.

    Example:
        ```
        def test_cache_operations(temp_cache):
            cache = temp_cache
            # Use cache for testing
        ```
    """
    return ASTCache(str(tmp_path / "test_cache.db"))


def test_detects_undocumented(
    detector: DriftDetector, temp_cache: ASTCache, temp_py_file: str
) -> None:
    """
    Tests that the drift detector correctly identifies undocumented code elements in a Python file.

    Verifies that when checking a temporary Python file, the DriftDetector produces at least one result with status 'undocumented', confirming the detector's ability to identify missing or incomplete documentation.

    Args:
        detector (DriftDetector): The drift detector instance used to check for documentation issues.
        temp_cache (ASTCache): The AST cache used for parsing and storing abstract syntax tree information.
        temp_py_file (str): Path to the temporary Python file to be checked for undocumented elements.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_detects_undocumented(detector, temp_cache, '/tmp/test_file.py')
        ```
    """
    results = detector.check_file(temp_py_file, temp_cache)
    assert any(r.status == "undocumented" for r in results)


def test_detects_signature_change(detector: DriftDetector) -> None:
    """
    Tests that the drift detector correctly identifies when a function signature has changed by comparing parameters.

    This test creates two versions of a function with different parameter lists (one with a single parameter 'x', another with parameters 'x' and 'y') and verifies that the detector's _signature_changed method returns True when comparing them.

    Args:
        detector (DriftDetector): The drift detector instance used to test signature change detection.

    Returns:
        None: This is a test function and does not return a value.

    Example:
        ```
        test_detects_signature_change(drift_detector)
        ```
    """
    def _make_func(**kwargs) -> ParsedFunction:
        defaults = dict(
            name="foo",
            language="python",
            file_path="foo.py",
            start_byte=0,
            end_byte=10,
            start_line=0,
            end_line=2,
            source="def foo(): pass",
            existing_docstring="Does foo.",
            parameters=[],
            return_type=None,
            is_async=False,
            decorators=[],
        )
        defaults.update(kwargs)
        return ParsedFunction(**defaults)

    old_func = _make_func(parameters=[{"name": "x", "type_annotation": "int"}])
    new_func = _make_func(
        parameters=[
            {"name": "x", "type_annotation": "int"},
            {"name": "y", "type_annotation": "str"},
        ]
    )
    assert detector._signature_changed(old_func, new_func) is True


def test_marks_as_up_to_date_correctly(detector: DriftDetector) -> None:
    """
    Tests that the DriftDetector correctly identifies a function with complete documentation and unchanged signature as up-to-date.

    Creates a test ParsedFunction with a complete docstring and verifies that the detector correctly identifies it as having full parameter coverage and no signature changes when compared to itself.

    Args:
        detector (DriftDetector): The DriftDetector instance used to check docstring coverage and signature changes.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_marks_as_up_to_date_correctly(detector)
        ```
    """
    def _make_func(**kwargs) -> ParsedFunction:
        defaults = dict(
            name="foo",
            language="python",
            file_path="foo.py",
            start_byte=0,
            end_byte=10,
            start_line=0,
            end_line=2,
            source="def foo(x: int) -> int: pass",
            existing_docstring="Does foo with x.",
            parameters=[{"name": "x", "type_annotation": "int"}],
            return_type="int",
            is_async=False,
            decorators=[],
        )
        defaults.update(kwargs)
        return ParsedFunction(**defaults)

    func = _make_func()
    assert detector._docstring_covers_params(func) is True
    assert detector._signature_changed(func, func) is False


def test_detects_undocumented_param(detector: DriftDetector) -> None:
    """
    Tests that the drift detector correctly identifies when a function parameter is not documented in the docstring.

    Creates a ParsedFunction object with two parameters ('x' and 'y') but a docstring that only mentions 'x', then verifies that the _docstring_covers_params method returns False to indicate incomplete parameter documentation.

    Args:
        detector (DriftDetector): The drift detector instance used to check docstring parameter coverage.

    Returns:
        None: This is a test function that does not return a value.

    Example:
        ```
        test_detects_undocumented_param(drift_detector_instance)
        ```
    """
    func = ParsedFunction(
        name="bar",
        language="python",
        file_path="bar.py",
        start_byte=0,
        end_byte=20,
        start_line=0,
        end_line=2,
        source="def bar(x: int, y: str) -> None: pass",
        existing_docstring="Does bar with x only.",
        parameters=[
            {"name": "x", "type_annotation": "int"},
            {"name": "y", "type_annotation": "str"},
        ],
        return_type=None,
        is_async=False,
        decorators=[],
    )
    assert detector._docstring_covers_params(func) is False


def test_check_directory(
    detector: DriftDetector, temp_cache: ASTCache, temp_dir_with_py: str
) -> None:
    """
    Tests that the DriftDetector.check_directory method returns a list of DriftResult instances when checking a directory.

    This unit test verifies the correct behavior of the drift detection functionality by confirming that checking a directory with Python files returns a list containing only DriftResult objects. It validates both the return type and the types of all elements in the returned list.

    Args:
        detector (DriftDetector): The DriftDetector instance used to perform drift detection checks.
        temp_cache (ASTCache): The temporary AST cache fixture used for storing and retrieving parsed abstract syntax trees.
        temp_dir_with_py (str): The path to a temporary directory containing Python files to be checked for drift.

    Returns:
        None: This test function does not return a value; it performs assertions to validate behavior.

    Example:
        ```
        test_check_directory(detector, temp_cache, '/tmp/test_python_files')
        ```
    """
    results = detector.check_directory(temp_dir_with_py, temp_cache)
    assert isinstance(results, list)
    assert all(isinstance(r, DriftResult) for r in results)
