from __future__ import annotations

import json
import os
from typing import Literal

from pydantic import BaseModel

from core.llm.prompts import DocStyle


class WrightConfig(BaseModel):
    style: DocStyle = DocStyle.GOOGLE
    verbosity: Literal["concise", "standard", "detailed"] = "standard"
    languages: list[str] = ["python", "javascript", "typescript", "java", "go", "rust"]
    exclude: list[str] = [
        # Version control
        ".git", ".svn", ".hg",
        # Python
        "__pycache__", ".venv", "venv", "env", ".env", ".tox",
        ".mypy_cache", ".pytest_cache", ".ruff_cache", ".eggs",
        "*.egg-info", "site-packages", "htmlcov",
        # JavaScript / Node
        "node_modules", "bower_components", ".pnp",
        # Build outputs
        "dist", "build", "out", "output", ".next", ".nuxt",
        "_build", ".build", "public/build",
        # Compiled / binary
        "target", "bin", "obj", "pkg",
        # Java / Kotlin
        ".gradle", ".mvn",
        # Rust
        ".cargo",
        # Go
        "vendor",
        # IDE / OS
        ".idea", ".vscode", ".DS_Store",
        # Coverage / reports
        "coverage", ".coverage", "htmlcov", "lcov-report",
        # Misc
        "tmp", "temp", ".tmp", "logs", ".cache",
    ]
    output_dir: str = "docs"
    coverage_threshold: float = 0.7
    max_tokens_per_request: int = 8000
    model: str = "claude-sonnet-4-5"
    include_examples: bool = True


def load_config(repo_root: str) -> WrightConfig:
    config_path = os.path.join(repo_root, ".wright.json")
    if not os.path.exists(config_path):
        return WrightConfig()
    with open(config_path, encoding="utf-8") as f:
        data = json.load(f)
    return WrightConfig.model_validate(data)


def save_config(config: WrightConfig, repo_root: str) -> None:
    config_path = os.path.join(repo_root, ".wright.json")
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config.model_dump(), f, indent=2)
