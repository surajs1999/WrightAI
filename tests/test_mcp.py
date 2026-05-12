"""Tests for MCP server tools."""

from __future__ import annotations

import os

import pytest


@pytest.mark.asyncio
async def test_list_undocumented_returns_valid_structure(tmp_path) -> None:
    """
    Tests that the _list_undocumented function returns a dictionary with the expected structure and data types.

    Verifies that the _list_undocumented function returns a result containing 'total', 'documented', and 'undocumented' keys, and that the 'undocumented' value is a list, using a temporary directory as the repository root.

    Args:
        tmp_path (Path): Pytest fixture providing a temporary directory path for testing.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        await test_list_undocumented_returns_valid_structure(tmp_path)
        ```
    """
    from mcp_server.server import _list_undocumented

    result = await _list_undocumented({"repo_root": str(tmp_path)})
    assert "total" in result
    assert "documented" in result
    assert "undocumented" in result
    assert isinstance(result["undocumented"], list)


@pytest.mark.asyncio
async def test_list_undocumented_finds_functions(sample_py_path: str) -> None:
    """
    Tests that the _list_undocumented function correctly identifies undocumented functions in a Python repository.

    This async test verifies that the _list_undocumented function can scan a repository root directory and detect undocumented Python functions. It asserts that the sample.py file contains at least one undocumented function and that the total count of analyzed items is greater than zero.

    Args:
        sample_py_path (str): Path to a sample Python file used for testing undocumented function detection.

    Returns:
        None: This test function does not return a value.

    Raises:
        AssertionError: When the _list_undocumented function fails to find any functions or undocumented items in the sample repository.

    Example:
        ```
        await test_list_undocumented_finds_functions('/path/to/sample.py')
        ```
    """
    from mcp_server.server import _list_undocumented

    repo_root = os.path.dirname(sample_py_path)
    result = await _list_undocumented({"repo_root": repo_root})
    assert result["total"] > 0
    # sample.py has undocumented functions
    assert result["undocumented_count"] > 0


@pytest.mark.asyncio
async def test_get_function_doc_returns_doc(sample_py_path: str) -> None:
    """
    Tests that _get_function_doc returns the documentation for a specified function in a Python file.

    This async test function verifies that the _get_function_doc function correctly retrieves documentation for a function named 'add_numbers' from a sample Python file. It asserts that the returned result contains the correct function name, file path, and a non-null docstring.

    Args:
        sample_py_path (str): The file path to a sample Python file containing the 'add_numbers' function to be documented.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        await test_get_function_doc_returns_doc('/path/to/sample.py')
        ```
    """
    from mcp_server.server import _get_function_doc

    result = await _get_function_doc(
        {
            "function_name": "add_numbers",
            "file_path": sample_py_path,
            "repo_root": os.path.dirname(sample_py_path),
        }
    )
    assert result.get("function_name") == "add_numbers"
    assert result.get("file_path") == sample_py_path
    assert result.get("docstring") is not None


@pytest.mark.asyncio
async def test_get_function_doc_not_found(sample_py_path: str) -> None:
    """
    Tests that _get_function_doc returns an error when attempting to retrieve documentation for a nonexistent function.

    This async test verifies the error handling behavior of the _get_function_doc function when provided with a function name that does not exist in the specified Python file. It expects the result to contain an 'error' key indicating the function was not found.

    Args:
        sample_py_path (str): Path to a sample Python file used for testing the function documentation retrieval.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        await test_get_function_doc_not_found('/path/to/sample.py')
        ```
    """
    from mcp_server.server import _get_function_doc

    result = await _get_function_doc(
        {
            "function_name": "nonexistent_function_xyz",
            "file_path": sample_py_path,
            "repo_root": os.path.dirname(sample_py_path),
        }
    )
    assert "error" in result
