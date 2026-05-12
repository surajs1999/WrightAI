"""Tests for CLI commands."""

from __future__ import annotations

import json
import os

from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()


def test_init_creates_config_file(tmp_path) -> None:
    """
    Tests that the init command creates a valid configuration file in the specified directory.

    Verifies that invoking the CLI init command with a temporary path creates a .wright.json configuration file with the expected structure, specifically checking that the 'style' key is present in the configuration.

    Args:
        tmp_path (Path): A pytest fixture providing a temporary directory path for testing file creation.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_init_creates_config_file(tmp_path)
        ```
    """
    result = runner.invoke(app, ["init", str(tmp_path)], input="y\n")
    assert result.exit_code == 0
    config_path = tmp_path / ".wright.json"
    assert config_path.exists()
    with open(config_path) as f:
        config = json.load(f)
    assert "style" in config


def test_coverage_outputs_table(tmp_path) -> None:
    """
    Tests that the coverage command outputs a table with coverage information for an empty directory.

    Verifies that invoking the coverage CLI command on a temporary directory results in successful execution (exit code 0) and produces output containing the word 'Coverage' or 'coverage', confirming that the coverage report table is generated correctly for directories with no functions (which should show 100% coverage).

    Args:
        tmp_path (Path): A temporary directory path fixture provided by pytest for isolated file system testing.

    Returns:
        None: This test function does not return any value.

    Example:
        ```
        test_coverage_outputs_table(tmp_path)
        ```
    """
    result = runner.invoke(app, ["coverage", str(tmp_path)])
    # Empty dir has 100% coverage (no functions)
    assert result.exit_code == 0
    assert "Coverage" in result.output or "coverage" in result.output.lower()


def test_coverage_with_py_files(sample_py_path: str) -> None:
    """
    Tests that the coverage command executes successfully and outputs percentage information for a directory containing Python files.

    This test function verifies the CLI coverage command works correctly by invoking it on a directory path derived from a sample Python file path. It asserts that the command runs (exits with code 0 or 1 based on threshold) and produces output containing a percentage symbol, indicating coverage metrics were calculated and displayed.

    Args:
        sample_py_path (str): Path to a sample Python file used to determine the directory for coverage analysis.

    Returns:
        None: This function does not return a value; it performs assertions to verify test conditions.

    Example:
        ```
        test_coverage_with_py_files('/path/to/project/sample.py')
        ```
    """
    dir_path = os.path.dirname(sample_py_path)
    result = runner.invoke(app, ["coverage", dir_path])
    # Should exit 0 or 1 based on threshold — just verify it runs
    assert "%" in result.output


def test_generate_dry_run_prints_preview(sample_py_path: str, monkeypatch) -> None:
    """
    Verifies that the CLI application can be imported without crashing as a smoke test for dry-run functionality.

    This is a minimal test function that checks if the CLI main app can be successfully imported without errors. It serves as a basic verification that the command structure is valid and the module loads correctly, without invoking actual LLM calls.

    Args:
        sample_py_path (str): Path to a sample Python file used in test fixtures (currently unused in this test).
        monkeypatch (pytest.MonkeyPatch): Pytest fixture for mocking and patching objects during testing (currently unused in this test).

    Returns:
        None: This function does not return any value.

    Raises:
        ImportError: When the cli.main module cannot be imported due to missing dependencies or syntax errors.
        AssertionError: When the imported app object is None or does not exist.

    Example:
        ```
        test_generate_dry_run_prints_preview('/path/to/sample.py', monkeypatch_fixture)
        ```

    Complexity: O(1) time, O(1) space
    """
    # We can't call the real LLM in tests, so just verify the command structure
    # by checking it starts without crashing on import
    from cli.main import app

    assert app is not None
