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
    """
    Resolves and returns the UUID of a user record matching the given API key, or None if no match is found.

    Queries the 'users' table in the database for a row whose 'api_key' column matches the provided key. If a matching record exists, its 'id' UUID string is returned. If no record is found or any exception occurs during the database call, None is returned silently. This function is used internally by record_event() and get_stats() to map an API key to a user identity before performing usage-related operations.

    Args:
        api_key (str): The API key string used to look up the corresponding user record in the database.

    Returns:
        str | None: The UUID string of the matching user's 'id' field if a record is found, or None if no matching user exists or a database error occurs.

    Example:
        ```
        user_id = _resolve_user_id('sk-abc123xyz456')
        if user_id:
            print(f'Resolved user ID: {user_id}')
        else:
            print('API key not found or invalid.')
        ```
    """
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
    """
    Records a single usage event for the user identified by the given API key, silently ignoring all errors.

    Resolves the user ID associated with the provided API key and inserts a usage event record into the 'usage_events' database table. If the API key is empty, the user ID cannot be resolved, or any exception occurs during the database operation, the function exits silently without raising. This makes it safe to call as a fire-and-forget side effect from any route handler.

    Args:
        api_key (str): The API key identifying the user on whose behalf the event is being recorded. If empty or unresolvable, the function returns without inserting any record.
        event_type (str): A string label categorising the type of event being recorded (e.g., 'generate_docstring', 'check_drift', 'get_coverage').
        tokens (int): The number of tokens consumed by the event. Defaults to 0 if not applicable or unknown.
        repo_name (str | None): Optional name of the repository associated with the event. Pass None if not applicable.
        language (str | None): Optional programming language associated with the event (e.g., 'python', 'javascript'). Pass None if not applicable.

    Returns:
        None: This function does not return a value.

    Example:
        ```
        record_event(
            api_key='sk-abc123',
            event_type='generate_docstring',
            tokens=512,
            repo_name='my-org/my-repo',
            language='python'
        )
        ```
    """
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
    """
    Retrieves and aggregates usage statistics for a given API key, shaped for the /usage API response.

    Resolves the provided API key to an internal user ID, then queries all usage events for that user from the database. Aggregates counts for documentation generations, drift checks, coverage scans, total tokens consumed, and API calls within the current day and current calendar month. Returns an empty stats dictionary if the API key is missing, cannot be resolved, or if any exception occurs during processing.

    Args:
        api_key (str): The API key used to identify and authenticate the user whose usage statistics are to be retrieved. An empty or falsy value causes an empty stats dict to be returned immediately.

    Returns:
        dict: A dictionary containing aggregated usage metrics with keys: 'api_calls_today' (int), 'api_calls_month' (int), 'docs_generated' (int), 'drift_checks_run' (int), 'coverage_scans' (int), and 'tokens_used' (int). Returns an empty stats dictionary (all values zeroed) if the API key is invalid, the user cannot be resolved, or an error occurs.

    Example:
        ```
        stats = get_stats('sk-abc123xyz')
        print(stats)
        # {
        #   'api_calls_today': 5,
        #   'api_calls_month': 42,
        #   'docs_generated': 10,
        #   'drift_checks_run': 8,
        #   'coverage_scans': 3,
        #   'tokens_used': 18500
        # }
        ```

    Complexity: O(n) time where n is the total number of usage events for the user, due to linear scans over the events list for each aggregation.
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
    Constructs and returns a fresh dictionary with all usage statistics fields initialized to zero.

    Serves as the canonical zero-state factory for usage statistics, providing a consistent baseline structure with six keys tracking API calls, document generation, drift checks, coverage scans, and token consumption. Called by get_stats() when no existing statistics record is found in the store.

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
