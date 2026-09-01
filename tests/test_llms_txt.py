"""Tests for deterministic llms.txt generation."""

from __future__ import annotations

import inspect

import pytest

from core.output.llms_txt import LLMSTxtWriter
from core.parser.tree_sitter_parser import CodeParser


@pytest.fixture
def parser() -> CodeParser:
    """Fresh CodeParser instance for each test."""
    return CodeParser()


def test_generate_has_no_llm_dependency() -> None:
    """
    Asserts LLMSTxtWriter.generate takes no gateway/LLM argument, proving
    generation is deterministic and does not require ANTHROPIC_API_KEY.
    """
    sig = inspect.signature(LLMSTxtWriter.generate)
    assert "gateway" not in sig.parameters
    assert not inspect.iscoroutinefunction(LLMSTxtWriter.generate)


def test_generate_includes_every_file_no_cap(tmp_path, parser: CodeParser) -> None:
    """
    Writes more than 20 tiny Python files (the old prompt-based pipeline only
    showed the LLM the first 20) and asserts every single one appears in the
    generated llms.txt, proving the truncation is gone.
    """
    num_files = 25
    for i in range(num_files):
        (tmp_path / f"module_{i}.py").write_text(
            f"def func_{i}(x: int) -> int:\n    return x + {i}\n"
        )

    parsed_files = parser.parse_directory(str(tmp_path))
    content = LLMSTxtWriter().generate(str(tmp_path), parsed_files, "test-repo")

    for i in range(num_files):
        assert f"module_{i}.py" in content
        assert f"func_{i}(x: int) -> int" in content


def test_documented_function_renders_signature_and_summary(tmp_path, parser: CodeParser) -> None:
    """Documented function's summary line and typed signature appear verbatim."""
    (tmp_path / "sample.py").write_text(
        "def add_numbers(a: int, b: int) -> int:\n"
        '    """Add two numbers together."""\n'
        "    return a + b\n"
    )

    parsed_files = parser.parse_directory(str(tmp_path))
    content = LLMSTxtWriter().generate(str(tmp_path), parsed_files, "test-repo")

    assert "`add_numbers(a: int, b: int) -> int`" in content
    assert "Add two numbers together." in content


def test_undocumented_function_marked(tmp_path, parser: CodeParser) -> None:
    """A function with no docstring renders the *Undocumented* marker."""
    (tmp_path / "sample.py").write_text("def mystery(x):\n    return x\n")

    parsed_files = parser.parse_directory(str(tmp_path))
    content = LLMSTxtWriter().generate(str(tmp_path), parsed_files, "test-repo")

    assert "*Undocumented*" in content


def test_do_not_modify_reflects_actual_excludes(tmp_path, parser: CodeParser) -> None:
    """
    'Do not modify' lists directories actually excluded during parsing
    (CodeParser's default exclude set), not an LLM guess.
    """
    (tmp_path / "sample.py").write_text("def f():\n    pass\n")

    parsed_files = parser.parse_directory(str(tmp_path))
    content = LLMSTxtWriter().generate(str(tmp_path), parsed_files, "test-repo")

    assert "## Do not modify" in content
    assert "node_modules" in content
    assert ".git" in content


def test_key_functions_section_present(tmp_path, parser: CodeParser) -> None:
    """A 'Key functions' section is emitted, ranked by PageRank centrality."""
    (tmp_path / "sample.py").write_text(
        "def helper():\n    return 1\n\ndef main():\n    return helper()\n"
    )

    parsed_files = parser.parse_directory(str(tmp_path))
    content = LLMSTxtWriter().generate(str(tmp_path), parsed_files, "test-repo")

    assert "## Key functions" in content


def test_write_persists_content_to_llms_txt(tmp_path) -> None:
    """write() writes the given content to llms.txt at the repo root."""
    LLMSTxtWriter().write("# hello\n", str(tmp_path))
    out_path = tmp_path / "llms.txt"
    assert out_path.exists()
    assert out_path.read_text() == "# hello\n"
