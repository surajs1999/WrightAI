"""Tests for AST chunker."""
from __future__ import annotations

import pytest

from core.parser.ast_chunker import ASTChunker, CodeChunk
from core.parser.tree_sitter_parser import CodeParser


@pytest.fixture
def chunker() -> ASTChunker:
    return ASTChunker()


@pytest.fixture
def parser() -> CodeParser:
    return CodeParser()


def test_chunks_respect_function_boundaries(chunker: ASTChunker, parser: CodeParser, sample_py_path: str) -> None:
    pf = parser.parse_file(sample_py_path)
    chunks = chunker.chunk_file(pf)
    assert len(chunks) > 0
    chunk_names = {c.name for c in chunks}
    assert "add_numbers" in chunk_names or any("add_numbers" in c.name for c in chunks)


def test_never_exceeds_max_tokens(chunker: ASTChunker, parser: CodeParser, sample_py_path: str) -> None:
    pf = parser.parse_file(sample_py_path)
    chunks = chunker.chunk_file(pf)
    for chunk in chunks:
        assert chunk.token_count <= ASTChunker.MAX_CHUNK_TOKENS


def test_merges_small_chunks(chunker: ASTChunker) -> None:
    small1 = CodeChunk(
        chunk_id="a",
        file_path="test.py",
        language="python",
        chunk_type="function",
        name="tiny1",
        source="def tiny1(): pass",
        start_line=0,
        end_line=0,
        token_count=5,
    )
    small2 = CodeChunk(
        chunk_id="b",
        file_path="test.py",
        language="python",
        chunk_type="function",
        name="tiny2",
        source="def tiny2(): pass",
        start_line=1,
        end_line=1,
        token_count=5,
    )
    merged = chunker._merge_small_chunks([small1, small2])
    # Both are small so they should merge
    assert len(merged) == 1
    assert "tiny1" in merged[0].name
    assert "tiny2" in merged[0].name


def test_handles_empty_file(chunker: ASTChunker, parser: CodeParser, tmp_path) -> None:
    empty_file = tmp_path / "empty.py"
    empty_file.write_text("")
    pf = parser.parse_file(str(empty_file))
    chunks = chunker.chunk_file(pf)
    assert chunks == []


def test_chunk_directory(chunker: ASTChunker, parser: CodeParser, temp_dir_with_py: str) -> None:
    parsed = parser.parse_directory(temp_dir_with_py)
    chunks = chunker.chunk_directory(parsed)
    assert len(chunks) > 0
    assert all(isinstance(c, CodeChunk) for c in chunks)
