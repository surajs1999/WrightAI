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
    exclude: list[str] = ["node_modules", ".git", "__pycache__", "dist", "build"]
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
