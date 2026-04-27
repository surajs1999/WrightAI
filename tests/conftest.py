"""Shared pytest fixtures."""

from __future__ import annotations

import os
import tempfile

import pytest

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
SAMPLE_PY = os.path.join(FIXTURES_DIR, "sample.py")
SAMPLE_JS = os.path.join(FIXTURES_DIR, "sample.js")
SAMPLE_TS = os.path.join(FIXTURES_DIR, "sample.ts")


@pytest.fixture
def sample_py_path() -> str:
    return SAMPLE_PY


@pytest.fixture
def sample_js_path() -> str:
    return SAMPLE_JS


@pytest.fixture
def sample_ts_path() -> str:
    return SAMPLE_TS


@pytest.fixture
def temp_py_file():
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write(
            "def hello(name: str) -> str:\n"
            "    return f'Hello, {name}'\n\n"
            "def goodbye(name: str, formal: bool = False) -> str:\n"
            "    if formal:\n"
            "        return f'Goodbye, {name}.'\n"
            "    return f'Bye {name}!'\n"
        )
        path = f.name
    yield path
    os.unlink(path)


@pytest.fixture
def temp_dir_with_py():
    with tempfile.TemporaryDirectory() as tmpdir:
        file1 = os.path.join(tmpdir, "module_a.py")
        file2 = os.path.join(tmpdir, "module_b.py")
        with open(file1, "w") as f:
            f.write("def func_a(x: int) -> int:\n    return x + 1\n")
        with open(file2, "w") as f:
            f.write("def func_b(y: str) -> str:\n    return y.upper()\n")
        yield tmpdir
