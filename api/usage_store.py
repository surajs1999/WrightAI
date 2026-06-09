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


def _resolve_user(api_key: str) -> tuple[str, str] | None:
    """Return (user_id, email) for the given API key, or None if not found."""
    try:
        result = _db().table("users").select("id, email").eq("api_key", api_key).execute()
        if result.data:
            row = result.data[0]
            return row["id"], row.get("email") or ""
        return None
    except Exception:
        return None


# Keep old name as alias so existing callers don't break.
def _resolve_user_id(api_key: str) -> str | None:
    resolved = _resolve_user(api_key)
    return resolved[0] if resolved else None


def record_event(
    api_key: str,
    event_type: str,
    tokens: int = 0,
    repo_name: str | None = None,
    language: str | None = None,
    model: str | None = None,
    is_fallback: bool = False,
    cache_hit: bool = False,
    retry_count: int = 0,
    duration_ms: int = 0,
    cache_read_tokens: int = 0,
    conversation_turns: int = 0,
    context_chunks: int = 0,
    doc_style: str | None = None,
    quality: str | None = None,
) -> None:
    """
    Records a single usage event for the user identified by the given API key, silently ignoring all errors.

    Resolves the user ID associated with the provided API key and inserts a usage event record into the 'usage_events' database table. If the API key is empty, the user ID cannot be resolved, or any exception occurs during the database operation, the function exits silently without raising. This makes it safe to call as a fire-and-forget side effect from any route handler.

    Args:
        api_key (str): The API key identifying the user on whose behalf the event is being recorded. If empty or unresolvable, the function returns without inserting any record.
        event_type (str): A string label categorising the type of event being recorded (e.g., 'generate_docstring', 'check_drift', 'get_coverage').
        tokens (int): The number of tokens consumed by the event. Defaults to 0 if not applicable or unknown.
        repo_name (str | None): Optional name of the repository associated with the event. Pass None if not applicable.
        language (str | None): Optional programming language associated with the event (e.g., 'python', 'javascript'). Pass None if not applicable.
        model (str | None): Exact model name used (e.g., 'claude-sonnet-4-6', 'gemini-2.5-pro').
        is_fallback (bool): True when Gemini was used as the fallback after Anthropic failed.
        cache_hit (bool): True when the result came entirely from cache (no LLM called).
        retry_count (int): Number of retry attempts before the call succeeded.
        duration_ms (int): Wall-clock latency of the LLM call in milliseconds.
        cache_read_tokens (int): Anthropic prompt-cache read tokens (billed at lower rate).
        conversation_turns (int): Number of prior turns in the chat history at call time.
        context_chunks (int): Number of retrieved context chunks passed to the LLM.
        doc_style (str | None): Docstring style used (e.g., 'google', 'numpy', 'sphinx').
        quality (str | None): Generation quality mode ('standard' or 'high').

    Returns:
        None: This function does not return a value.
    """
    if not api_key:
        return
    try:
        resolved = _resolve_user(api_key)
        if not resolved:
            return
        user_id, email = resolved
        _db().table("usage_events").insert(
            {
                "user_id": user_id,
                "user_email": email,
                "event_type": event_type,
                "tokens": tokens,
                "repo_name": repo_name,
                "language": language,
                "model": model,
                "is_fallback": is_fallback,
                "cache_hit": cache_hit,
                "retry_count": retry_count,
                "duration_ms": duration_ms,
                "cache_read_tokens": cache_read_tokens,
                "conversation_turns": conversation_turns,
                "context_chunks": context_chunks,
                "doc_style": doc_style,
                "quality": quality,
            }
        ).execute()
    except Exception:
        pass


def get_stats(api_key: str) -> dict:
    """
    Retrieves and aggregates usage statistics for a given API key, shaped for the /usage API response.

    Resolves the provided API key to an internal user ID, then queries all usage events for that user
    within the current calendar month. Aggregates counts per event type, total tokens, per-model usage,
    and language distribution. Returns an empty stats dictionary if the API key is missing or invalid.

    Args:
        api_key (str): The API key used to identify and authenticate the user whose usage statistics are to be retrieved.

    Returns:
        dict: A dictionary containing aggregated usage metrics.
    """
    if not api_key:
        return _empty_stats()
    try:
        user_id = _resolve_user_id(api_key)
        if not user_id:
            return _empty_stats()

        now = datetime.now(timezone.utc)
        today_start = now.strftime("%Y-%m-%d") + "T00:00:00+00:00"
        month_start = now.strftime("%Y-%m") + "-01T00:00:00+00:00"

        rows = (
            _db()
            .table("usage_events")
            .select("event_type, tokens, created_at, model, language")
            .eq("user_id", user_id)
            .gte("created_at", month_start)
            .execute()
        )
        events = rows.data or []

        docs_generated = sum(1 for e in events if e["event_type"] == "docs_generated")
        drift_checks_run = sum(1 for e in events if e["event_type"] == "drift_checks_run")
        coverage_scans = sum(1 for e in events if e["event_type"] == "coverage_scans")
        chat_messages = sum(1 for e in events if e["event_type"] == "chat_message")
        fix_prs = sum(1 for e in events if e["event_type"] == "fix_pr")
        llms_txt_generated = sum(1 for e in events if e["event_type"] == "llms_txt_generated")
        repos_connected = sum(1 for e in events if e["event_type"] == "repo_connect")
        repos_synced = sum(1 for e in events if e["event_type"] == "repo_sync")
        repos_indexed = sum(1 for e in events if e["event_type"] == "repo_index")
        tokens_used = sum(e.get("tokens") or 0 for e in events)
        api_calls_today = sum(1 for e in events if (e.get("created_at") or "") >= today_start)
        api_calls_month = sum(1 for e in events if (e.get("created_at") or "") >= month_start)

        # Per-model call distribution (exact model names, not provider grouping)
        model_usage: dict[str, int] = {}
        for e in events:
            m = e.get("model")
            if m:
                model_usage[m] = model_usage.get(m, 0) + 1

        # Language distribution
        language_usage: dict[str, int] = {}
        for e in events:
            lang = e.get("language")
            if lang:
                language_usage[lang] = language_usage.get(lang, 0) + 1

        return {
            "api_calls_today": api_calls_today,
            "api_calls_month": api_calls_month,
            "docs_generated": docs_generated,
            "drift_checks_run": drift_checks_run,
            "coverage_scans": coverage_scans,
            "chat_messages": chat_messages,
            "fix_prs": fix_prs,
            "llms_txt_generated": llms_txt_generated,
            "repos_connected": repos_connected,
            "repos_synced": repos_synced,
            "repos_indexed": repos_indexed,
            "tokens_used": tokens_used,
            "model_usage": model_usage,
            "language_usage": language_usage,
        }
    except Exception:
        return _empty_stats()


def _empty_stats() -> dict:
    return {
        "api_calls_today": 0,
        "api_calls_month": 0,
        "docs_generated": 0,
        "drift_checks_run": 0,
        "coverage_scans": 0,
        "chat_messages": 0,
        "fix_prs": 0,
        "llms_txt_generated": 0,
        "repos_connected": 0,
        "repos_synced": 0,
        "repos_indexed": 0,
        "tokens_used": 0,
        "model_usage": {},
        "language_usage": {},
    }
