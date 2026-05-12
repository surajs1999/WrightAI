"""Tests for dependency graph."""

from __future__ import annotations

import pytest

from core.parser.dep_graph import DependencyGraph
from core.parser.tree_sitter_parser import CodeParser


@pytest.fixture
def parser() -> CodeParser:
    """
    Creates and returns a CodeParser instance for use in pytest tests.

    This fixture provides a fresh CodeParser instance to test functions, ensuring test isolation and consistent setup across multiple test cases.

    Returns:
        CodeParser: A new instance of CodeParser for parsing code and detecting programming languages.

    Example:
        ```
        def test_example(parser):
            result = parser.detect_language('file.py')
        ```
    """
    return CodeParser()


@pytest.fixture
def dep_graph() -> DependencyGraph:
    """
    Creates and returns a new DependencyGraph instance for use in tests.

    Pytest fixture that provides a fresh DependencyGraph object for each test function that requests it, ensuring test isolation.

    Returns:
        DependencyGraph: A newly instantiated DependencyGraph object.

    Example:
        ```
        def test_example(dep_graph):
            # dep_graph is automatically injected by pytest
            dep_graph.add_node('node1')
        ```
    """
    return DependencyGraph()


def test_builds_graph_from_imports(
    dep_graph: DependencyGraph, parser: CodeParser, temp_dir_with_py: str
) -> None:
    """
    Tests that the dependency graph successfully builds a graph from parsed imports with at least one node.

    This test verifies the integration between the CodeParser and DependencyGraph by parsing a directory containing Python files, building a dependency graph from the parsed results, and asserting that the resulting graph contains at least one node.

    Args:
        dep_graph (DependencyGraph): The dependency graph builder instance used to construct the graph from parsed code.
        parser (CodeParser): The code parser instance used to parse Python files in the directory.
        temp_dir_with_py (str): The path to a temporary directory containing Python files to be parsed and analyzed.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_builds_graph_from_imports(dep_graph, parser, '/tmp/test_project')
        ```
    """
    parsed = parser.parse_directory(temp_dir_with_py)
    graph = dep_graph.build(parsed)
    assert graph.number_of_nodes() > 0


def test_pagerank_scores_are_normalized(
    dep_graph: DependencyGraph, parser: CodeParser, sample_py_path: str
) -> None:
    """
    Tests that PageRank scores computed by the dependency graph are properly normalized to sum to 1.0.

    This test verifies the normalization property of PageRank scores by parsing a Python file, building a dependency graph from it, computing PageRank scores, and asserting that the sum of all scores is approximately 1.0 (within 0.01 tolerance).

    Args:
        dep_graph (DependencyGraph): The dependency graph instance used to build the graph and compute PageRank scores.
        parser (CodeParser): The code parser instance used to parse Python source files.
        sample_py_path (str): The file path to a sample Python file to be parsed and analyzed.

    Returns:
        None: This test function does not return a value.

    Raises:
        AssertionError: When the PageRank scores dictionary is empty or when the sum of scores deviates from 1.0 by more than 0.01.

    Example:
        ```
        test_pagerank_scores_are_normalized(dep_graph, parser, 'sample.py')
        ```
    """
    parsed = [parser.parse_file(sample_py_path)]
    dep_graph.build(parsed)
    scores = dep_graph.get_pagerank_scores()
    assert len(scores) > 0
    total = sum(scores.values())
    assert abs(total - 1.0) < 0.01  # PageRank sums to 1


def test_get_callers_returns_correct_functions(
    dep_graph: DependencyGraph, parser: CodeParser, sample_py_path: str
) -> None:
    """
    Tests that the get_callers method of DependencyGraph returns a list of caller functions for a given function name and file path.

    This test verifies the functionality of the dependency graph's get_callers method by parsing a sample Python file, building the dependency graph, and asserting that the result is a list type when querying for callers of the 'add_numbers' function.

    Args:
        dep_graph (DependencyGraph): The dependency graph instance used to track and query function call relationships.
        parser (CodeParser): The code parser instance used to parse Python source files into an analyzable structure.
        sample_py_path (str): The file path to the sample Python file to be parsed and analyzed.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_get_callers_returns_correct_functions(dep_graph, parser, '/path/to/sample.py')
        ```
    """
    parsed = [parser.parse_file(sample_py_path)]
    dep_graph.build(parsed)
    # Just verify it doesn't throw and returns a list
    callers = dep_graph.get_callers("add_numbers", sample_py_path)
    assert isinstance(callers, list)


def test_get_callees_returns_correct_functions(
    dep_graph: DependencyGraph, parser: CodeParser, sample_py_path: str
) -> None:
    """Tests that get_callees returns a list of functions called by the given function."""
    parsed = [parser.parse_file(sample_py_path)]
    dep_graph.build(parsed)
    callees = dep_graph.get_callees("add_numbers", sample_py_path)
    assert isinstance(callees, list)


def test_get_top_functions(
    dep_graph: DependencyGraph, parser: CodeParser, sample_py_path: str
) -> None:
    """
    Tests that the DependencyGraph.get_top_functions method correctly returns a list of top-ranked functions with valid node IDs and scores.

    Validates that the dependency graph can be built from parsed code and that the get_top_functions method returns a properly formatted list containing tuples of node IDs (strings) and their corresponding scores (non-negative floats), with length not exceeding the requested limit.

    Args:
        dep_graph (DependencyGraph): The dependency graph instance used to build and query function relationships.
        parser (CodeParser): The code parser instance used to parse Python source files into analyzable structures.
        sample_py_path (str): The file path to a sample Python file to be parsed and analyzed.

    Returns:
        None: This test function does not return a value.

    Example:
        ```
        test_get_top_functions(dep_graph, parser, '/path/to/sample.py')
        ```
    """
    parsed = [parser.parse_file(sample_py_path)]
    dep_graph.build(parsed)
    top = dep_graph.get_top_functions(5)
    assert isinstance(top, list)
    assert len(top) <= 5
    for node_id, score in top:
        assert isinstance(node_id, str)
        assert isinstance(score, float)
        assert score >= 0
