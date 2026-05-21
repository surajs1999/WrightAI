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
        ".git",
        ".svn",
        ".hg",
        # Python
        "__pycache__",
        ".venv",
        "venv",
        "env",
        ".env",
        ".tox",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        ".eggs",
        "*.egg-info",
        "site-packages",
        "htmlcov",
        # JavaScript / Node
        "node_modules",
        "bower_components",
        ".pnp",
        # Build outputs
        "dist",
        "build",
        "out",
        "output",
        ".next",
        ".nuxt",
        "_build",
        ".build",
        "public/build",
        # Compiled / binary
        "target",
        "bin",
        "obj",
        "pkg",
        # Java / Kotlin
        ".gradle",
        ".mvn",
        # Rust
        ".cargo",
        # Go
        "vendor",
        # IDE / OS
        ".idea",
        ".vscode",
        ".DS_Store",
        # Coverage / reports
        "coverage",
        ".coverage",
        "htmlcov",
        "lcov-report",
        # Misc
        "tmp",
        "temp",
        ".tmp",
        "logs",
        ".cache",
    ]
    output_dir: str = "docs"
    coverage_threshold: float = 0.7
    max_tokens_per_request: int = 8000
    model: str = "claude-sonnet-4-5"
    include_examples: bool = True


def load_config(repo_root: str) -> WrightConfig:
    """
    Loads Wright configuration from a .wright.json file in the repository root, returning a default WrightConfig if the file does not exist.

    Reads and parses the .wright.json configuration file located at the specified repository root directory. If the file is absent, a default WrightConfig instance is returned. Pydantic model validation is used to parse and validate the JSON data against the WrightConfig schema. This function is called by core CLI commands such as generate, coverage, and drift.

    Args:
        repo_root (str): Absolute or relative path to the repository root directory where the .wright.json configuration file should be located.

    Returns:
        WrightConfig: A WrightConfig instance populated with values from .wright.json, or a default WrightConfig instance if the file does not exist.

    Raises:
        json.JSONDecodeError: When the .wright.json file contains invalid or malformed JSON syntax.
        pydantic.ValidationError: When the parsed JSON data does not conform to the WrightConfig schema.
        IOError: When the .wright.json file exists but cannot be read due to insufficient permissions or other I/O errors.

    Example:
        ```
        config = load_config('/path/to/my/project')
        print(config.output_dir)
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
    Serializes a WrightConfig object to a .wright.json file in the specified repository root directory.

    Uses Pydantic's model_dump() method to convert the WrightConfig object to a dictionary, then writes it as a formatted JSON file with UTF-8 encoding and 2-space indentation. This function is called by init() during repository initialization to persist configuration settings.

    Args:
        config (WrightConfig): The WrightConfig Pydantic model instance to be serialized and saved to disk.
        repo_root (str): The absolute or relative path to the repository root directory where the .wright.json file will be created.

    Returns:
        None: This function does not return a value; it writes the configuration directly to the filesystem.

    Raises:
        OSError: When the file cannot be written due to insufficient permissions or an invalid directory path.
        TypeError: When the WrightConfig object contains fields that cannot be serialized to JSON.

    Example:
        ```
        wright_config = WrightConfig(project_name='my-project', version='1.0.0')
        save_config(wright_config, '/home/user/projects/my-project')
        ```
    """
    config_path = os.path.join(repo_root, ".wright.json")
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config.model_dump(), f, indent=2)
