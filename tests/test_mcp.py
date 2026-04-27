"""Tests for MCP server tools."""

from __future__ import annotations

import os

import pytest


@pytest.mark.asyncio
async def test_list_undocumented_returns_valid_structure(tmp_path) -> None:
    from mcp_server.server import _list_undocumented

    result = await _list_undocumented({"repo_root": str(tmp_path)})
    assert "total" in result
    assert "documented" in result
    assert "undocumented" in result
    assert isinstance(result["undocumented"], list)


@pytest.mark.asyncio
async def test_list_undocumented_finds_functions(sample_py_path: str) -> None:
    from mcp_server.server import _list_undocumented

    repo_root = os.path.dirname(sample_py_path)
    result = await _list_undocumented({"repo_root": repo_root})
    assert result["total"] > 0
    # sample.py has undocumented functions
    assert result["undocumented_count"] > 0


@pytest.mark.asyncio
async def test_get_function_doc_returns_doc(sample_py_path: str) -> None:
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
    from mcp_server.server import _get_function_doc

    result = await _get_function_doc(
        {
            "function_name": "nonexistent_function_xyz",
            "file_path": sample_py_path,
            "repo_root": os.path.dirname(sample_py_path),
        }
    )
    assert "error" in result
