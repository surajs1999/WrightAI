from __future__ import annotations

from datetime import datetime, timezone


def _db():
    """
    Retrieves the shared database connection instance by delegating to the user store's internal database accessor.

    Acts as a proxy to the `_db` function defined in `api.user_store`, ensuring that `api.usage_store` uses the same underlying database connection. The import is deferred inside the function body to avoid circular import issues at module load time.

    Returns:
        unknown: The database connection or client instance returned by `api.user_store._db()`.

    Example:
        ```
        db = _db()
        records = db.collection('usage').find({})
        ```
    """
    from api.user_store import _db as _get_db
    return _get_db()


def _resolve_user_id(api_key: str) -> str | None:
    """Return the users.id UUID for the given API key, or None if not found."""
    try:
        result = _db().table("users").select("id").eq("api_key", api_key).execute()
        return result.data[0]["id"] if result.data else None
    except Exception:
        return None


def record_event(
    api_key: str,
    event_type: str,
    tokens: int = 0,
    repo_name: str | None = None,
    language: str | None = None,
) -> None:
    """Insert one usage event for the user identified by api_key. Never raises."""
    if not api_key:
        return
    try:
        user_id = _resolve_user_id(api_key)
        if not user_id:
            return
        _db().table("usage_events").insert({
            "user_id": user_id,
            "event_type": event_type,
            "tokens": tokens,
            "repo_name": repo_name,
            "language": language,
        }).execute()
    except Exception:
        pass


def get_stats(api_key: str) -> dict:
    """Return usage stats shaped for the /usage API response."""
    if not api_key:
        return _empty_stats()
    try:
        user_id = _resolve_user_id(api_key)
        if not user_id:
            return _empty_stats()

        now = datetime.now(timezone.utc)
        today_start = now.strftime("%Y-%m-%d") + "T00:00:00+00:00"
        month_start = now.strftime("%Y-%m") + "-01T00:00:00+00:00"

        rows = _db().table("usage_events") \
            .select("event_type, tokens, created_at") \
            .eq("user_id", user_id) \
            .execute()
        events = rows.data or []

        docs_generated   = sum(1 for e in events if e["event_type"] == "docs_generated")
        drift_checks_run = sum(1 for e in events if e["event_type"] == "drift_checks_run")
        coverage_scans   = sum(1 for e in events if e["event_type"] == "coverage_scans")
        tokens_used      = sum(e.get("tokens") or 0 for e in events)
        api_calls_today  = sum(1 for e in events if (e.get("created_at") or "") >= today_start)
        api_calls_month  = sum(1 for e in events if (e.get("created_at") or "") >= month_start)

        return {
            "api_calls_today":  api_calls_today,
            "api_calls_month":  api_calls_month,
            "docs_generated":   docs_generated,
            "drift_checks_run": drift_checks_run,
            "coverage_scans":   coverage_scans,
            "tokens_used":      tokens_used,
        }
    except Exception:
        return _empty_stats()


def _empty_stats() -> dict:
    """
    Returns a dictionary with all usage statistics fields initialized to zero.

    Constructs and returns a fresh statistics dictionary containing six keys that track API usage, document generation, drift checks, coverage scans, and token consumption. This function serves as the canonical zero-state factory for usage statistics and is called by get_stats() when no existing stats record is found.

    Returns:
        dict: A dictionary with keys 'api_calls_today', 'api_calls_month', 'docs_generated', 'drift_checks_run', 'coverage_scans', and 'tokens_used', all set to integer value 0.

    Example:
        ```
        stats = _empty_stats()
        # stats == {'api_calls_today': 0, 'api_calls_month': 0, 'docs_generated': 0, 'drift_checks_run': 0, 'coverage_scans': 0, 'tokens_used': 0}
        ```
    """
    return {
        "api_calls_today":  0,
        "api_calls_month":  0,
        "docs_generated":   0,
        "drift_checks_run": 0,
        "coverage_scans":   0,
        "tokens_used":      0,
    }
