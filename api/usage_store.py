from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

_EMPTY: dict = {
    "docs_generated": 0,
    "drift_checks_run": 0,
    "coverage_scans": 0,
    "tokens_used": 0,
    "daily": {},
}


def _usage_file(api_key: str) -> Path | None:
    """
    Resolves and returns the path to a user-specific 'usage.json' file, creating the necessary directory structure if it does not already exist.

    Derives a user directory name from the last 12 characters of the provided API key (sanitizing '/' and '.' characters to '_'), appends it to the base repository path (defaulting to '/data/repos' or the value of the REPOS_PATH environment variable), attempts to create the directory, and returns the full path to 'usage.json' within that directory. Returns None if directory creation fails due to an OSError.

    Args:
        api_key (str): The API key used to derive a unique user directory name; the last 12 characters are extracted and sanitized to form a valid directory name.

    Returns:
        Path | None: A Path object pointing to the 'usage.json' file inside the user-specific directory, or None if the directory could not be created due to an OSError.

    Example:
        ```
        file_path = _usage_file('sk-abc123xyz789uvw')
        if file_path:
            print(file_path)  # e.g., Path('/data/repos/23xyz789uvw/usage.json')
        ```
    """
    base = Path(os.getenv("REPOS_PATH", "/data/repos"))
    user_dir = base / api_key[-12:].replace("/", "_").replace(".", "_")
    try:
        user_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        return None
    return user_dir / "usage.json"


def _load(api_key: str) -> dict:
    """
    Loads usage data for the given API key from its corresponding file, returning an empty usage dict if the file does not exist or cannot be parsed.

    Resolves the storage file path for the provided API key via `_usage_file`. If the file exists and contains valid JSON, its contents are deserialized and returned. If the file is missing, unresolvable, or contains malformed JSON, a fresh copy of the default empty usage structure (`_EMPTY`) is returned instead. This function is called by both `record_event` and `get_stats` to retrieve the current usage state before processing.

    Args:
        api_key (str): The API key whose associated usage data file should be loaded.

    Returns:
        dict: A dictionary containing the usage data for the given API key, or a copy of the default empty usage structure if no valid data file is found.

    Example:
        ```
        usage_data = _load('sk-abc123xyz')
        print(usage_data)
        ```
    """
    f = _usage_file(api_key)
    if f and f.exists():
        try:
            return json.loads(f.read_text())
        except Exception:
            pass
    return dict(_EMPTY)


def _save(api_key: str, data: dict) -> None:
    """
    Serializes and writes usage data to the file associated with the given API key.

    Retrieves the usage file path for the specified API key via `_usage_file()` and, if a valid path is returned, attempts to write the provided data dictionary as a JSON string. Any exceptions raised during the file write operation are silently suppressed. This function is called internally by `record_event()` to persist usage tracking data.

    Args:
        api_key (str): The API key used to resolve the target usage file path via `_usage_file()`.
        data (dict): A dictionary containing usage data to be serialized as JSON and written to the usage file.

    Returns:
        None: This function does not return a value.

    Example:
        ```
        _save('sk-abc123', {'events': [{'type': 'api_call', 'timestamp': '2024-01-01T00:00:00Z'}]})
        ```
    """
    f = _usage_file(api_key)
    if f:
        try:
            f.write_text(json.dumps(data))
        except Exception:
            pass


def record_event(api_key: str, event: str, tokens: int = 0) -> None:
    """Increment usage counter for event ('docs_generated', 'drift_checks_run', 'coverage_scans')."""
    data = _load(api_key)
    data[event] = data.get(event, 0) + 1
    data["tokens_used"] = data.get("tokens_used", 0) + tokens

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    daily = data.setdefault("daily", {})
    daily[today] = daily.get(today, 0) + 1

    # Keep only 31 days of daily data
    if len(daily) > 31:
        oldest = sorted(daily)[0]
        del daily[oldest]

    _save(api_key, data)


def get_stats(api_key: str) -> dict:
    """Return usage stats shaped for the /usage API response."""
    data = _load(api_key)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    this_month = today[:7]

    daily = data.get("daily", {})
    api_calls_today = daily.get(today, 0)
    api_calls_month = sum(v for k, v in daily.items() if k.startswith(this_month))

    return {
        "api_calls_today": api_calls_today,
        "api_calls_month": api_calls_month,
        "docs_generated": data.get("docs_generated", 0),
        "drift_checks_run": data.get("drift_checks_run", 0),
        "coverage_scans": data.get("coverage_scans", 0),
        "tokens_used": data.get("tokens_used", 0),
    }
