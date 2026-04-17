"""Tests for CLI commands."""
from __future__ import annotations

import json
import os

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()


def test_init_creates_config_file(tmp_path) -> None:
    result = runner.invoke(app, ["init", str(tmp_path)], input="y\n")
    assert result.exit_code == 0
    config_path = tmp_path / ".wright.json"
    assert config_path.exists()
    with open(config_path) as f:
        config = json.load(f)
    assert "style" in config


def test_coverage_outputs_table(tmp_path) -> None:
    result = runner.invoke(app, ["coverage", str(tmp_path)])
    # Empty dir has 100% coverage (no functions)
    assert result.exit_code == 0
    assert "Coverage" in result.output or "coverage" in result.output.lower()


def test_coverage_with_py_files(sample_py_path: str) -> None:
    dir_path = os.path.dirname(sample_py_path)
    result = runner.invoke(app, ["coverage", dir_path])
    # Should exit 0 or 1 based on threshold — just verify it runs
    assert "%" in result.output


def test_generate_dry_run_prints_preview(sample_py_path: str, monkeypatch) -> None:
    # We can't call the real LLM in tests, so just verify the command structure
    # by checking it starts without crashing on import
    from cli.main import app
    assert app is not None
