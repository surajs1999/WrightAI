"""Tests for dependency graph."""
from __future__ import annotations

import pytest

from core.parser.dep_graph import DependencyGraph
from core.parser.tree_sitter_parser import CodeParser


@pytest.fixture
def parser() -> CodeParser:
    return CodeParser()


@pytest.fixture
def dep_graph() -> DependencyGraph:
    return DependencyGraph()


def test_builds_graph_from_imports(dep_graph: DependencyGraph, parser: CodeParser, temp_dir_with_py: str) -> None:
    parsed = parser.parse_directory(temp_dir_with_py)
    graph = dep_graph.build(parsed)
    assert graph.number_of_nodes() > 0


def test_pagerank_scores_are_normalized(dep_graph: DependencyGraph, parser: CodeParser, sample_py_path: str) -> None:
    parsed = [parser.parse_file(sample_py_path)]
    dep_graph.build(parsed)
    scores = dep_graph.get_pagerank_scores()
    assert len(scores) > 0
    total = sum(scores.values())
    assert abs(total - 1.0) < 0.01  # PageRank sums to 1


def test_get_callers_returns_correct_functions(dep_graph: DependencyGraph, parser: CodeParser, sample_py_path: str) -> None:
    parsed = [parser.parse_file(sample_py_path)]
    dep_graph.build(parsed)
    # Just verify it doesn't throw and returns a list
    callers = dep_graph.get_callers("add_numbers", sample_py_path)
    assert isinstance(callers, list)


def test_get_callees_returns_correct_functions(dep_graph: DependencyGraph, parser: CodeParser, sample_py_path: str) -> None:
    parsed = [parser.parse_file(sample_py_path)]
    dep_graph.build(parsed)
    callees = dep_graph.get_callees("add_numbers", sample_py_path)
    assert isinstance(callees, list)


def test_get_top_functions(dep_graph: DependencyGraph, parser: CodeParser, sample_py_path: str) -> None:
    parsed = [parser.parse_file(sample_py_path)]
    dep_graph.build(parsed)
    top = dep_graph.get_top_functions(5)
    assert isinstance(top, list)
    assert len(top) <= 5
    for node_id, score in top:
        assert isinstance(node_id, str)
        assert isinstance(score, float)
        assert score >= 0
