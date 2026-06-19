"""
Ops alerting for Wright AI. Run hourly via POST /internal/cron/ops-alert.

Queries the last 24 hours of usage_events for anomalies and emails
hello@wrightai.live if any thresholds are breached. Fail-open: a query
or email error never propagates to the cron caller.

Thresholds (all tunable via env vars):
  OPS_FALLBACK_RATE_THRESHOLD   — max fraction of LLM calls that may fall back
                                   to Gemini before alerting (default 0.20 = 20%)
  OPS_HIGH_RETRY_THRESHOLD      — max fraction of calls needing >2 retries (default 0.10)
  OPS_LATENCY_MS_THRESHOLD      — max avg LLM latency in ms before alerting (default 30000)
  OPS_MIN_CALLS_THRESHOLD       — min expected LLM calls in 24 h; fewer fires a zero-traffic
                                   alert (default 10; set to 0 to disable)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

_logger = logging.getLogger("wright.ops_alerts")
_OPS_EMAIL = "hello@wrightai.live"

_LLM_EVENT_TYPES = ["docs_generated", "chat_message", "drift_checks_run", "fix_pr"]


def _threshold(name: str, default: float) -> float:
    import os

    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


# ── Main check ────────────────────────────────────────────────────────────────


def run_ops_alert_check() -> dict:
    """
    Query the last 24 h of usage_events, fire alert emails for any anomalies,
    and return a summary dict. Safe to call from a cron endpoint.
    """
    try:
        from api.user_store import _db

        db = _db()
        now = datetime.now(tz=timezone.utc)
        since = (now - timedelta(hours=24)).isoformat()

        result = (
            db.table("usage_events")
            .select("event_type, is_fallback, retry_count, duration_ms")
            .in_("event_type", _LLM_EVENT_TYPES)
            .gte("created_at", since)
            .execute()
        )
        events = result.data or []
        total = len(events)

        alerts: list[str] = []
        stats: dict = {"window_hours": 24, "total_llm_calls": total}

        _check_zero_traffic(total, alerts, stats)
        if total > 0:
            _check_fallback_rate(events, total, alerts, stats)
            _check_retry_rate(events, total, alerts, stats)
            _check_latency(events, alerts, stats)

        stats["alerts_fired"] = len(alerts)

        if alerts:
            _send_ops_alert(alerts, stats, now)
            _logger.warning("Ops alert fired", extra={"alerts": alerts, **stats})
        else:
            _logger.info("Ops check passed", extra=stats)

        return {"ok": True, **stats}

    except Exception:
        _logger.exception("Ops alert check failed")
        return {"ok": False, "error": "check failed — see logs"}


# ── Individual checks ─────────────────────────────────────────────────────────


def _check_zero_traffic(total: int, alerts: list, stats: dict) -> None:
    min_calls = int(_threshold("OPS_MIN_CALLS_THRESHOLD", 10))
    if min_calls > 0 and total < min_calls:
        alerts.append(
            f"Zero / very low traffic: only {total} LLM calls in the last 24 h "
            f"(threshold: {min_calls}). Service may be down or receiving no traffic."
        )
        stats["zero_traffic"] = True


def _check_fallback_rate(events: list, total: int, alerts: list, stats: dict) -> None:
    threshold = _threshold("OPS_FALLBACK_RATE_THRESHOLD", 0.20)
    fallbacks = sum(1 for e in events if e.get("is_fallback"))
    rate = fallbacks / total
    stats["fallback_calls"] = fallbacks
    stats["fallback_rate_pct"] = round(rate * 100, 1)
    if rate > threshold:
        alerts.append(
            f"High Gemini fallback rate: {stats['fallback_rate_pct']}% of LLM calls fell back "
            f"({fallbacks}/{total}, threshold {int(threshold * 100)}%). "
            "Anthropic API may be degraded or rate-limiting."
        )


def _check_retry_rate(events: list, total: int, alerts: list, stats: dict) -> None:
    threshold = _threshold("OPS_HIGH_RETRY_THRESHOLD", 0.10)
    high_retry = sum(1 for e in events if (e.get("retry_count") or 0) > 2)
    rate = high_retry / total
    stats["high_retry_calls"] = high_retry
    stats["high_retry_rate_pct"] = round(rate * 100, 1)
    if rate > threshold:
        alerts.append(
            f"High retry rate: {stats['high_retry_rate_pct']}% of calls needed >2 retries "
            f"({high_retry}/{total}, threshold {int(threshold * 100)}%). "
            "LLM API may be throttling requests."
        )


def _check_latency(events: list, alerts: list, stats: dict) -> None:
    threshold_ms = _threshold("OPS_LATENCY_MS_THRESHOLD", 30_000)
    durations = [e["duration_ms"] for e in events if e.get("duration_ms")]
    if not durations:
        return
    avg_ms = sum(durations) / len(durations)
    stats["avg_latency_ms"] = round(avg_ms)
    if avg_ms > threshold_ms:
        alerts.append(
            f"High average LLM latency: {stats['avg_latency_ms']} ms avg "
            f"(threshold {int(threshold_ms)} ms). LLM APIs are responding slowly."
        )


# ── Email composer ────────────────────────────────────────────────────────────


def _send_ops_alert(alerts: list[str], stats: dict, ts: datetime) -> None:
    try:
        from api.tasks.email_tasks import send_email, _wrap, _h2, _p
    except Exception:
        _logger.error("Could not import email helpers — ops alert not sent")
        return

    window = stats.get("window_hours", 24)
    ts_str = ts.strftime("%Y-%m-%d %H:%M UTC")

    alert_items = "".join(
        f'<li style="margin-bottom:12px;font-size:14px;color:#4a4868;">{a}</li>' for a in alerts
    )

    display_keys = [
        "total_llm_calls",
        "fallback_rate_pct",
        "high_retry_rate_pct",
        "avg_latency_ms",
    ]
    stat_rows = "".join(
        f"<tr>"
        f'<td style="padding:7px 14px;font-size:13px;color:#4a4868;border-bottom:1px solid #f0eefa;">{k}</td>'
        f'<td style="padding:7px 14px;font-size:13px;font-family:monospace;color:#1a1630;border-bottom:1px solid #f0eefa;">{stats[k]}</td>'
        f"</tr>"
        for k in display_keys
        if k in stats
    )

    body = (
        _h2(f"⚠️ Wright AI Ops — {len(alerts)} alert(s) at {ts_str}")
        + _p(f"The following anomalies were detected in the last {window} hours:")
        + f'<ul style="margin:0 0 24px;padding-left:20px;line-height:2;">{alert_items}</ul>'
        + '<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1a1630;">Metrics (last 24 h):</p>'
        + (
            f'<table style="width:100%;border:1px solid #ebe9f8;border-radius:8px;'
            f'overflow:hidden;margin-bottom:24px;">{stat_rows}</table>'
            if stat_rows
            else ""
        )
        + _p(
            '<a href="https://supabase.com/dashboard" style="color:#534AB7;">Supabase dashboard →</a>'
            "&nbsp;&nbsp;"
            '<a href="https://sentry.io" style="color:#534AB7;">Sentry →</a>',
            mb=0,
        )
    )

    sent = send_email(
        _OPS_EMAIL,
        f"Wright AI Ops Alert — {len(alerts)} issue(s) detected",
        _wrap(body),
    )
    if not sent:
        _logger.error("Failed to send ops alert email to %s", _OPS_EMAIL)
