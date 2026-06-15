from __future__ import annotations

import logging
from datetime import datetime, timezone

_logger = logging.getLogger("wright.tokens")


def user_id_from_api_key(api_key: str) -> str:
    """Stable per-user identifier derived from an API key — last 12 chars,
    sanitized for use as a key/path segment. Matches the id used for repo
    storage paths (see _user_id_from_request in api/routes/repos.py).
    """
    return api_key[-12:].replace("/", "_").replace(".", "_")


def _db():
    from api.user_store import _db as _get_db

    return _get_db()


def save_token(user_id: str, key: str, token: str) -> None:
    """Upsert a token for (user_id, key).

    `key` is '_github_oauth' for the user's GitHub OAuth token, or a repo
    slug (e.g. 'owner/repo') for a per-repo deploy token saved at connect time.
    """
    try:
        _db().table("tokens").upsert(
            {
                "user_id": user_id,
                "key": key,
                "token": token,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="user_id,key",
        ).execute()
    except Exception:
        _logger.exception("Failed to save token for user_id=%s key=%s", user_id, key)


def load_token(user_id: str, key: str) -> str | None:
    """Return the stored token for (user_id, key), or None if not found or on error."""
    try:
        result = (
            _db().table("tokens").select("token").eq("user_id", user_id).eq("key", key).execute()
        )
        if result.data:
            return result.data[0]["token"]
    except Exception:
        _logger.exception("Failed to load token for user_id=%s key=%s", user_id, key)
    return None


def delete_token(user_id: str, key: str) -> None:
    """Delete the stored token for (user_id, key), e.g. when a repo is disconnected."""
    try:
        _db().table("tokens").delete().eq("user_id", user_id).eq("key", key).execute()
    except Exception:
        _logger.exception("Failed to delete token for user_id=%s key=%s", user_id, key)
