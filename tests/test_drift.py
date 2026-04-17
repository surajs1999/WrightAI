"""Tests for drift detector."""
from __future__ import annotations

import os
import tempfile

import pytest

from core.drift.drift_detector import DriftDetector, DriftResult
from core.parser.cache import ASTCache
from core.parser.tree_sitter_parser import CodeParser, ParsedFunction


@pytest.fixture
def detector() -> DriftDetector:
    return DriftDetector()


@pytest.fixture
def parser() -> CodeParser:
    return CodeParser()


@pytest.fixture
def temp_cache(tmp_path) -> ASTCache:
    return ASTCache(str(tmp_path / "test_cache.db"))


def test_detects_undocumented(detector: DriftDetector, temp_cache: ASTCache, temp_py_file: str) -> None:
    results = detector.check_file(temp_py_file, temp_cache)
    assert any(r.status == "undocumented" for r in results)


def test_detects_signature_change(detector: DriftDetector) -> None:
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
        parameters=[{"name": "x", "type_annotation": "int"}, {"name": "y", "type_annotation": "str"}]
    )
    assert detector._signature_changed(old_func, new_func) is True


def test_marks_as_up_to_date_correctly(detector: DriftDetector) -> None:
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


def test_check_directory(detector: DriftDetector, temp_cache: ASTCache, temp_dir_with_py: str) -> None:
    results = detector.check_directory(temp_dir_with_py, temp_cache)
    assert isinstance(results, list)
    assert all(isinstance(r, DriftResult) for r in results)
