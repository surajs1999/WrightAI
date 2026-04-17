from __future__ import annotations

import re
from typing import Any

import networkx as nx

from core.parser.tree_sitter_parser import ParsedFile


class DependencyGraph:
    def __init__(self) -> None:
        self._graph: nx.DiGraph = nx.DiGraph()
        self._function_index: dict[str, str] = {}  # name -> node_id

    def build(self, parsed_files: list[ParsedFile]) -> nx.DiGraph:
        self._graph = nx.DiGraph()
        self._function_index = {}

        # First pass: register all functions as nodes
        for pf in parsed_files:
            for func in pf.functions:
                node_id = f"{pf.path}::{func.name}"
                self._graph.add_node(node_id, file_path=pf.path, function_name=func.name)
                self._function_index[func.name] = node_id
            for cls in pf.classes:
                for method in cls.methods:
                    node_id = f"{pf.path}::{cls.name}.{method.name}"
                    self._graph.add_node(node_id, file_path=pf.path, function_name=method.name, class_name=cls.name)
                    self._function_index[method.name] = node_id

        # Second pass: build edges from source analysis
        for pf in parsed_files:
            for func in pf.functions:
                caller_id = f"{pf.path}::{func.name}"
                self._find_and_add_call_edges(caller_id, func.source, pf.path)
            for cls in pf.classes:
                for method in cls.methods:
                    caller_id = f"{pf.path}::{cls.name}.{method.name}"
                    self._find_and_add_call_edges(caller_id, method.source, pf.path)

        return self._graph

    def _find_and_add_call_edges(self, caller_id: str, source: str, file_path: str) -> None:
        # Simple heuristic: find identifiers followed by ( that match known function names
        call_pattern = re.compile(r'\b(\w+)\s*\(')
        for match in call_pattern.finditer(source):
            callee_name = match.group(1)
            if callee_name in self._function_index:
                callee_id = self._function_index[callee_name]
                if callee_id != caller_id:
                    self._graph.add_edge(caller_id, callee_id)

    def get_callers(self, function_name: str, file_path: str) -> list[tuple[str, str]]:
        node_id = f"{file_path}::{function_name}"
        if node_id not in self._graph:
            return []
        callers = []
        for pred in self._graph.predecessors(node_id):
            data = self._graph.nodes[pred]
            callers.append((data.get("file_path", ""), data.get("function_name", "")))
        return callers

    def get_callees(self, function_name: str, file_path: str) -> list[tuple[str, str]]:
        node_id = f"{file_path}::{function_name}"
        if node_id not in self._graph:
            return []
        callees = []
        for succ in self._graph.successors(node_id):
            data = self._graph.nodes[succ]
            callees.append((data.get("file_path", ""), data.get("function_name", "")))
        return callees

    def get_pagerank_scores(self) -> dict[str, float]:
        if not self._graph.nodes:
            return {}
        try:
            return nx.pagerank(self._graph, alpha=0.85)
        except nx.PowerIterationFailedConvergence:
            return {node: 1.0 / len(self._graph.nodes) for node in self._graph.nodes}

    def get_top_functions(self, n: int = 20) -> list[tuple[str, float]]:
        scores = self.get_pagerank_scores()
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_scores[:n]

    @property
    def graph(self) -> nx.DiGraph:
        return self._graph
