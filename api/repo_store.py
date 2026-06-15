from __future__ import annotations

import logging
from datetime import datetime, timezone

_logger = logging.getLogger("wright.repos.store")


def _db():
    from api.user_store import _db as _get_db

    return _get_db()


def save_repo(user_id: str, repo_slug: str, meta: dict) -> None:
    """Upsert repo metadata for (user_id, repo_slug). meta has git_url, branch, local_path."""
    try:
        _db().table("repo_meta").upsert(
            {
                "user_id": user_id,
                "repo_slug": repo_slug,
                "git_url": meta.get("git_url", ""),
                "branch": meta.get("branch", "main"),
                "local_path": meta.get("local_path", ""),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="user_id,repo_slug",
        ).execute()
    except Exception:
        _logger.exception(
            "Failed to save repo meta for user_id=%s repo_slug=%s", user_id, repo_slug
        )


def list_repos(user_id: str) -> dict[str, dict]:
    """Return {repo_slug: {git_url, branch, local_path}} for user_id, {} on error/empty."""
    try:
        result = (
            _db()
            .table("repo_meta")
            .select("repo_slug, git_url, branch, local_path")
            .eq("user_id", user_id)
            .execute()
        )
        return {
            row["repo_slug"]: {
                "git_url": row["git_url"],
                "branch": row["branch"],
                "local_path": row["local_path"],
            }
            for row in (result.data or [])
        }
    except Exception:
        _logger.exception("Failed to list repos for user_id=%s", user_id)
        return {}


def delete_repo(user_id: str, repo_slug: str) -> None:
    """Delete repo metadata for (user_id, repo_slug)."""
    try:
        _db().table("repo_meta").delete().eq("user_id", user_id).eq(
            "repo_slug", repo_slug
        ).execute()
    except Exception:
        _logger.exception(
            "Failed to delete repo meta for user_id=%s repo_slug=%s", user_id, repo_slug
        )
