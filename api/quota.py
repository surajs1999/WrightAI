from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class PlanLimits:
    id: str
    display_name: str
    docs_per_month: int          # -1 = unlimited
    chat_messages_per_month: int
    drift_checks_per_month: int
    repos_limit: int
    api_keys_limit: int
    semantic_drift_enabled: bool
    auto_pr_enabled: bool
    github_action_comments_enabled: bool
    llms_txt_enabled: bool
    overage_rate_per_doc: float = 0.0  # $/doc above quota; 0 = hard block


@dataclass
class QuotaResult:
    allowed: bool
    warning: bool       # True when ≥80% consumed and not yet at limit
    used: int
    limit: int          # -1 = unlimited
    plan: str
    pct: int = 0        # 0–100; 0 when unlimited
    overage: bool = False           # True when allowed via soft overage (Pro)
    upgrade_url: str = "https://www.wrightai.live/pricing"

    def __post_init__(self) -> None:
        if self.limit > 0:
            self.pct = min(100, int(self.used / self.limit * 100))


# ---------------------------------------------------------------------------
# Free-plan defaults (fallback when DB is unavailable — fail-open)
# ---------------------------------------------------------------------------

_FREE_LIMITS = PlanLimits(
    id="free",
    display_name="Free",
    docs_per_month=100,
    chat_messages_per_month=0,
    drift_checks_per_month=-1,
    repos_limit=1,
    api_keys_limit=1,
    semantic_drift_enabled=False,
    auto_pr_enabled=False,
    github_action_comments_enabled=False,
    llms_txt_enabled=True,
    overage_rate_per_doc=0.0,
)

_UNLIMITED_RESULT = QuotaResult(allowed=True, warning=False, used=0, limit=-1, plan="unknown")


# ---------------------------------------------------------------------------
# DB helpers (lazy, fail-open)
# ---------------------------------------------------------------------------

def _db():
    from api.user_store import _db as _get_db
    return _get_db()


def get_plan_limits(plan_id: str) -> PlanLimits:
    """Fetch plan limits from the Supabase plans table; fall back to free on error."""
    try:
        result = _db().table("plans").select("*").eq("id", plan_id).execute()
        if result.data:
            row = result.data[0]
            return PlanLimits(
                id=row["id"],
                display_name=row["display_name"],
                docs_per_month=row["docs_per_month"],
                chat_messages_per_month=row["chat_messages_per_month"],
                drift_checks_per_month=row["drift_checks_per_month"],
                repos_limit=row["repos_limit"],
                api_keys_limit=row["api_keys_limit"],
                semantic_drift_enabled=row["semantic_drift_enabled"],
                auto_pr_enabled=row["auto_pr_enabled"],
                github_action_comments_enabled=row["github_action_comments_enabled"],
                llms_txt_enabled=row["llms_txt_enabled"],
                overage_rate_per_doc=float(row.get("overage_rate_per_doc") or 0.0),
            )
    except Exception:
        pass
    return _FREE_LIMITS


def get_user_plan(api_key: str) -> str:
    """Return the plan ID for a user identified by their API key."""
    if not api_key or not api_key.startswith("wai_"):
        return "free"
    try:
        result = _db().table("users").select("plan").eq("api_key", api_key).execute()
        if result.data:
            return result.data[0].get("plan", "free") or "free"
    except Exception:
        pass
    return "free"


def _resolve_user_id(api_key: str) -> str | None:
    try:
        result = _db().table("users").select("id").eq("api_key", api_key).execute()
        if result.data:
            return result.data[0]["id"]
    except Exception:
        pass
    return None


def _count_monthly_events(user_id: str, event_type: str) -> int:
    try:
        month_start = datetime.now(timezone.utc).strftime("%Y-%m") + "-01T00:00:00+00:00"
        result = (
            _db()
            .table("usage_events")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("event_type", event_type)
            .gte("created_at", month_start)
            .execute()
        )
        return result.count or len(result.data or [])
    except Exception:
        return 0


def _count_connected_repos(api_key: str) -> int:
    """Count repos stored on disk for this API key."""
    try:
        repos_base = Path(os.getenv("REPOS_BASE_PATH", "/tmp/wright_repos"))
        user_dir_name = api_key[-12:].replace("/", "_").replace(".", "_")
        user_dir = repos_base / user_dir_name
        if not user_dir.exists():
            return 0
        return sum(1 for p in user_dir.iterdir() if p.is_dir() and (p / ".git").exists())
    except Exception:
        return 0


def _trigger_email_alert(api_key: str, pct: int, used: int, limit: int) -> None:
    """Fire-and-forget: dispatch quota alert email via Celery (non-blocking)."""
    try:
        from api.tasks.email_tasks import send_quota_alert
        send_quota_alert.delay(api_key, pct, used, limit)
    except Exception:
        pass  # Never let email failures affect quota enforcement


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

Feature = Literal["docs_generated", "chat_message", "drift_checks_run", "repo_connect"]
FlagFeature = Literal["semantic_drift", "auto_pr", "github_action_comments"]


def check_quota(
    api_key: str,
    feature: Feature,
    raise_on_blocked: bool = True,
) -> QuotaResult:
    """
    Check whether this API key is within its monthly quota for feature.

    Only enforces for wai_ keys (hosted service). CLI/MCP users with a
    server-level static key bypass quota enforcement entirely (fail-open).

    Pro users with overage_rate_per_doc > 0 are allowed past their limit
    (soft overage) — usage is still tracked for end-of-period billing.

    Returns QuotaResult; raises HTTP 429/403 when blocked and raise_on_blocked=True.
    Fires a Celery email task at ≥80% and ≥100% usage (dedup handled in task).
    """
    from fastapi import HTTPException

    if not api_key or not api_key.startswith("wai_"):
        return _UNLIMITED_RESULT

    plan_id = get_user_plan(api_key)
    limits = get_plan_limits(plan_id)

    limit_map: dict[Feature, int] = {
        "docs_generated":   limits.docs_per_month,
        "chat_message":     limits.chat_messages_per_month,
        "drift_checks_run": limits.drift_checks_per_month,
        "repo_connect":     limits.repos_limit,
    }
    limit = limit_map.get(feature, -1)

    if limit == -1:
        return QuotaResult(allowed=True, warning=False, used=0, limit=-1, plan=plan_id)

    # Zero means feature completely disabled on this plan (e.g. chat on Free)
    if limit == 0:
        if raise_on_blocked:
            raise HTTPException(
                status_code=403,
                detail=_blocked_detail(feature, 0, 0, plan_id),
            )
        return QuotaResult(allowed=False, warning=False, used=0, limit=0, plan=plan_id)

    user_id = _resolve_user_id(api_key)
    if user_id is None:
        return QuotaResult(allowed=True, warning=False, used=0, limit=limit, plan=plan_id)

    used = _count_connected_repos(api_key) if feature == "repo_connect" else _count_monthly_events(user_id, feature)

    warning = int(limit * 0.8) <= used < limit
    blocked = used >= limit

    # Pro soft overage: allow past limit and track for billing
    overage = False
    if blocked and feature == "docs_generated" and limits.overage_rate_per_doc > 0:
        blocked = False
        overage = True

    result = QuotaResult(
        allowed=not blocked,
        warning=warning,
        used=used,
        limit=limit,
        plan=plan_id,
        overage=overage,
    )

    # Fire email alert at ≥80% (dedup handled inside Celery task)
    if result.pct >= 80:
        _trigger_email_alert(api_key, result.pct, used, limit)

    if blocked and raise_on_blocked:
        raise HTTPException(
            status_code=429,
            detail=_blocked_detail(feature, used, limit, plan_id),
        )
    return result


def check_feature_flag(
    api_key: str,
    feature: FlagFeature,
    raise_on_blocked: bool = True,
) -> bool:
    """
    Check whether a boolean feature is enabled for the user's plan.
    Raises HTTP 403 when disabled and raise_on_blocked=True.
    CLI/MCP static keys always have all features enabled.
    """
    from fastapi import HTTPException

    if not api_key or not api_key.startswith("wai_"):
        return True

    plan_id = get_user_plan(api_key)
    limits = get_plan_limits(plan_id)

    flag_map: dict[FlagFeature, bool] = {
        "semantic_drift":          limits.semantic_drift_enabled,
        "auto_pr":                 limits.auto_pr_enabled,
        "github_action_comments":  limits.github_action_comments_enabled,
    }
    enabled = flag_map.get(feature, False)

    if not enabled and raise_on_blocked:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "feature_not_available",
                "feature": feature,
                "plan": plan_id,
                "upgrade_url": "https://www.wrightai.live/pricing",
                "message": "This feature requires a Pro plan. Upgrade at wrightai.live/pricing",
            },
        )
    return enabled


def get_full_quota_status(api_key: str) -> dict:
    """
    Return a merged dict describing the user's plan and all quota usage.
    Used by the /usage endpoint to power the dashboard.
    """
    if not api_key or not api_key.startswith("wai_"):
        return {"plan": "cli", "quotas": {}}

    plan_id = get_user_plan(api_key)
    limits = get_plan_limits(plan_id)
    user_id = _resolve_user_id(api_key)

    def _usage(event_type: str) -> int:
        return _count_monthly_events(user_id, event_type) if user_id else 0

    def _quota_entry(used: int, limit: int) -> dict:
        pct = min(100, int(used / limit * 100)) if limit > 0 else 0
        return {
            "used": used,
            "limit": limit,
            "unlimited": limit == -1,
            "pct": pct,
            "warning": limit > 0 and pct >= 80 and used < limit,
            "blocked": limit > 0 and used >= limit,
        }

    docs_used = _usage("docs_generated")
    chat_used = _usage("chat_message")
    repos_used = _count_connected_repos(api_key)

    return {
        "plan": plan_id,
        "plan_display": limits.display_name,
        "features": {
            "semantic_drift":          limits.semantic_drift_enabled,
            "auto_pr":                 limits.auto_pr_enabled,
            "github_action_comments":  limits.github_action_comments_enabled,
        },
        "quotas": {
            "docs_generated": _quota_entry(docs_used, limits.docs_per_month),
            "chat_messages":  _quota_entry(chat_used, limits.chat_messages_per_month),
            "repos":          _quota_entry(repos_used, limits.repos_limit),
        },
        "upgrade_url": "https://www.wrightai.live/pricing",
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _blocked_detail(feature: str, used: int, limit: int, plan: str) -> dict:
    label = feature.replace("_", " ")
    return {
        "error": "quota_exceeded",
        "feature": feature,
        "used": used,
        "limit": limit,
        "plan": plan,
        "upgrade_url": "https://www.wrightai.live/pricing",
        "message": (
            f"You've used {used}/{limit} {label}s this month. "
            "Upgrade to Pro for more at wrightai.live/pricing"
        ),
    }
