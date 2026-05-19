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
    base = Path(os.getenv("REPOS_PATH", "/data/repos"))
    user_dir = base / api_key[-12:].replace("/", "_").replace(".", "_")
    try:
        user_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        return None
    return user_dir / "usage.json"


def _load(api_key: str) -> dict:
    f = _usage_file(api_key)
    if f and f.exists():
        try:
            return json.loads(f.read_text())
        except Exception:
            pass
    return dict(_EMPTY)


def _save(api_key: str, data: dict) -> None:
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
