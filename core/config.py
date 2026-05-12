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
    """
    Loads Wright configuration from a .wright.json file in the repository root or returns default configuration if not found.

    Reads the .wright.json configuration file from the specified repository root directory. If the file does not exist, returns a default WrightConfig instance. Uses Pydantic model validation to parse and validate the JSON data.

    Args:
        repo_root (str): Path to the repository root directory where .wright.json should be located.

    Returns:
        WrightConfig: A WrightConfig instance either loaded from .wright.json or with default values.

    Raises:
        json.JSONDecodeError: When the .wright.json file contains invalid JSON syntax.
        pydantic.ValidationError: When the JSON data does not match the WrightConfig schema.
        IOError: When the .wright.json file exists but cannot be read due to permissions or other I/O errors.

    Example:
        ```
        config = load_config('/path/to/my/project')
        ```

    Complexity: O(n) time where n is the size of the config file, O(n) space for parsed config data
    """
    config_path = os.path.join(repo_root, ".wright.json")
    if not os.path.exists(config_path):
        return WrightConfig()
    with open(config_path, encoding="utf-8") as f:
        data = json.load(f)
    return WrightConfig.model_validate(data)


def save_config(config: WrightConfig, repo_root: str) -> None:
    """
    Saves a WrightConfig object to a .wright.json file in the specified repository root directory.

    Serializes the WrightConfig object to JSON format using Pydantic's model_dump() method and writes it to a .wright.json file with UTF-8 encoding and 2-space indentation.

    Args:
        config (WrightConfig): The WrightConfig object to be serialized and saved.
        repo_root (str): The path to the repository root directory where the .wright.json file will be created.

    Returns:
        None: This function does not return a value.

    Raises:
        OSError: When the file cannot be written due to permission issues or invalid path.
        TypeError: When the config object cannot be serialized to JSON.

    Example:
        ```
        save_config(my_wright_config, '/path/to/repo')
        ```
    """
    config_path = os.path.join(repo_root, ".wright.json")
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config.model_dump(), f, indent=2)
