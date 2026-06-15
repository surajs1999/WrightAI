"""
Transactional email tasks for WrightAI.

Emails are sent via Brevo (https://brevo.com).
Set BREVO_API_KEY and BREVO_FROM_EMAIL in your environment.

All send_* functions call Brevo synchronously (with a small inline retry).
Callers wrap them in try/except for fail-open behavior — quota alerts and
welcome emails are rare enough that the added latency is negligible.

Functions:
  send_email          — base send function, retried up to 2x
  send_quota_alert    — dedup-checked quota warning / exceeded email
  run_onboarding_drip — daily task for day-7 and day-14 nudges,
                        triggered via POST /internal/cron/onboarding-drip
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone

_FROM_NAME = "Wright AI"
_FROM_EMAIL = os.getenv("BREVO_FROM_EMAIL", "hello@wrightai.live")


# ---------------------------------------------------------------------------
# Brevo client (lazy, fail-open) — SDK v4
# ---------------------------------------------------------------------------


def _brevo_client():
    """Return a configured brevo.Brevo client, or None if BREVO_API_KEY is not set."""
    api_key = os.getenv("BREVO_API_KEY", "")
    if not api_key:
        return None
    try:
        import brevo

        return brevo.Brevo(api_key=api_key)
    except ImportError:
        return None


# ---------------------------------------------------------------------------
# Base send task
# ---------------------------------------------------------------------------


def send_email(to: str, subject: str, html: str) -> bool:
    """Send a transactional email via Brevo, retrying once on failure."""
    client = _brevo_client()
    if not client:
        return False
    try:
        import brevo
    except ImportError:
        return False

    for attempt in range(2):
        try:
            client.transactional_emails.send_transac_email(
                sender=brevo.SendTransacEmailRequestSender(name=_FROM_NAME, email=_FROM_EMAIL),
                to=[brevo.SendTransacEmailRequestToItem(email=to)],
                subject=subject,
                html_content=html,
            )
            return True
        except Exception:
            if attempt == 0:
                time.sleep(1)
    return False


# ---------------------------------------------------------------------------
# HTML template helpers
# ---------------------------------------------------------------------------


def _wrap(body: str) -> str:
    """Wrap email body in a consistent branded shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f4fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4fb;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);max-width:100%;">
        <!-- Header -->
        <tr><td style="background:#080612;padding:22px 32px;border-bottom:1px solid #1a1630;">
          <span style="font-size:16px;font-weight:700;color:#e8e6f4;letter-spacing:-0.02em;">Wright AI</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 32px 24px;color:#1a1630;">{body}</td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9f8fd;padding:18px 32px;border-top:1px solid #ebe9f8;">
          <p style="margin:0;font-size:11px;color:#9590b0;line-height:1.6;">
            You're receiving this because you have a Wright AI account.<br>
            <a href="https://www.wrightai.live/dashboard/settings" style="color:#534AB7;text-decoration:none;">Manage email preferences</a>
            &nbsp;·&nbsp;
            <a href="https://www.wrightai.live" style="color:#534AB7;text-decoration:none;">wrightai.live</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _btn(label: str, url: str, color: str = "#534AB7") -> str:
    return (
        f'<a href="{url}" style="display:inline-block;padding:11px 26px;'
        f"background:{color};color:#ffffff;text-decoration:none;border-radius:8px;"
        f'font-size:14px;font-weight:600;letter-spacing:-0.01em;">{label}</a>'
    )


def _h2(text: str) -> str:
    return f'<h2 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#1a1630;letter-spacing:-0.02em;line-height:1.3;">{text}</h2>'


def _p(text: str, mb: int = 20) -> str:
    return f'<p style="margin:0 0 {mb}px;font-size:15px;color:#4a4868;line-height:1.75;">{text}</p>'


def _bar(pct: int, color: str = "#EF9F27") -> str:
    return (
        f'<div style="background:#f0eefa;border-radius:999px;height:8px;margin-bottom:24px;overflow:hidden;">'
        f'<div style="background:{color};height:100%;width:{min(pct, 100)}%;border-radius:999px;"></div>'
        f"</div>"
    )


# ---------------------------------------------------------------------------
# Email composers
# ---------------------------------------------------------------------------


def send_welcome(to: str, first_name: str = "") -> None:
    """Send the welcome / onboarding email immediately after sign-up."""
    name = first_name.strip() or "there"
    body = (
        _h2(f"Welcome to Wright AI, {name}")
        + _p(
            "You're set up and ready to auto-document your codebase. Here's how to get your first docstring in under 2 minutes:"
        )
        + """
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:28px;">
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0eefa;">
            <span style="font-size:13px;font-weight:700;color:#534AB7;font-family:monospace;margin-right:10px;">1</span>
            <span style="font-size:14px;color:#4a4868;">Install the VS Code extension — search <strong>Wright AI</strong> in the Extensions panel</span>
          </td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f0eefa;">
            <span style="font-size:13px;font-weight:700;color:#534AB7;font-family:monospace;margin-right:10px;">2</span>
            <span style="font-size:14px;color:#4a4868;">Open any Python, TypeScript, Go, Rust, or Java file</span>
          </td></tr>
          <tr><td style="padding:10px 0;">
            <span style="font-size:13px;font-weight:700;color:#534AB7;font-family:monospace;margin-right:10px;">3</span>
            <span style="font-size:14px;color:#4a4868;">Right-click a function → <strong>Wright: Generate Docstring</strong></span>
          </td></tr>
        </table>
        """
        + f'<p style="margin:0 0 24px;">{_btn("Go to Dashboard →", "https://www.wrightai.live/dashboard")}</p>'
        + _p(
            "You're on the <strong>Free plan</strong> — 100 doc generations per month, no credit card needed. The CLI and MCP server are always free with your own Anthropic key.",
            mb=0,
        )
    )
    send_email(to, "Welcome to Wright AI — first docstring in 2 minutes", _wrap(body))


def send_quota_warning(to: str, used: int, limit: int, pct: int) -> None:
    """Send the 80% quota warning email."""
    remaining = limit - used
    body = (
        _h2(f"You've used {pct}% of your monthly generations")
        + _p(
            f"You have <strong>{remaining} doc generation{'s' if remaining != 1 else ''} left</strong> this month. "
            "When you hit 100% the hosted API pauses until the 1st — but your CLI keeps working with your own Anthropic key."
        )
        + _bar(pct, "#EF9F27")
        + "<p style='margin:0 0 8px;font-size:14px;font-weight:600;color:#1a1630;'>Pro gives you 10× more, plus:</p>"
        + """<ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#4a4868;line-height:2.1;">
          <li><strong>1,000</strong> doc generations / month</li>
          <li>Semantic (LLM) drift detection</li>
          <li>100 codebase chat messages / month</li>
          <li>Auto-PR for drift fixes</li>
          <li>5 connected repositories</li>
        </ul>"""
        + f'<p style="margin:0 0 20px;">{_btn("Upgrade to Pro — $18/mo →", "https://www.wrightai.live/pricing")}</p>'
        + _p("Or your quota resets automatically on the 1st of next month.", mb=0)
    )
    send_email(to, f"You've used {pct}% of your Wright AI generations this month", _wrap(body))


def send_quota_exceeded(to: str) -> None:
    """Send the hard-limit hit email."""
    body = (
        _h2("You've hit your monthly limit")
        + _p(
            "You've used all 100 of your free doc generations this month. "
            "The hosted API is paused until the 1st — but <strong>the CLI still works</strong> if you have your own Anthropic key (<code>ANTHROPIC_API_KEY</code>)."
        )
        + _bar(100, "#E24B4A")
        + "<p style='margin:0 0 8px;font-size:14px;font-weight:600;color:#1a1630;'>Upgrade now to keep going without interruption:</p>"
        + """<ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#4a4868;line-height:2.1;">
          <li><strong>1,000 generations / month</strong> — never hit a wall mid-sprint</li>
          <li>Semantic drift + codebase chat</li>
          <li>Auto-PR for drift fixes</li>
        </ul>"""
        + f'<p style="margin:0 0 20px;">{_btn("Upgrade to Pro — $18/mo →", "https://www.wrightai.live/pricing")}</p>'
        + _p("Your free quota resets automatically on the 1st of next month.", mb=0)
    )
    send_email(to, "You've hit your Wright AI limit for this month", _wrap(body))


def send_day7_nudge(to: str, docs_count: int) -> None:
    """Day-7 onboarding nudge for active free users."""
    body = (
        _h2(f"You've documented {docs_count} functions in your first week")
        + _p("Here's what Pro users have that you don't yet:")
        + """
        <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #ebe9f8;border-radius:10px;overflow:hidden;margin-bottom:28px;">
          <tr style="background:#f9f8fd;">
            <th style="padding:10px 16px;font-size:11px;color:#9590b0;text-align:left;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Feature</th>
            <th style="padding:10px 16px;font-size:11px;color:#9590b0;text-align:center;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Free</th>
            <th style="padding:10px 16px;font-size:11px;color:#534AB7;text-align:center;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Pro</th>
          </tr>
          <tr style="border-top:1px solid #ebe9f8;">
            <td style="padding:11px 16px;font-size:14px;color:#4a4868;">Doc generations</td>
            <td style="text-align:center;font-size:13px;color:#9590b0;font-family:monospace;">100/mo</td>
            <td style="text-align:center;font-size:13px;color:#534AB7;font-weight:700;font-family:monospace;">1,000/mo</td>
          </tr>
          <tr style="border-top:1px solid #ebe9f8;background:#f9f8fd;">
            <td style="padding:11px 16px;font-size:14px;color:#4a4868;">Semantic drift (LLM)</td>
            <td style="text-align:center;font-size:15px;color:#d0cce8;">✗</td>
            <td style="text-align:center;font-size:15px;color:#1D9E75;">✓</td>
          </tr>
          <tr style="border-top:1px solid #ebe9f8;">
            <td style="padding:11px 16px;font-size:14px;color:#4a4868;">Codebase chat</td>
            <td style="text-align:center;font-size:15px;color:#d0cce8;">✗</td>
            <td style="text-align:center;font-size:15px;color:#1D9E75;">✓</td>
          </tr>
          <tr style="border-top:1px solid #ebe9f8;background:#f9f8fd;">
            <td style="padding:11px 16px;font-size:14px;color:#4a4868;">Auto-PR for drift fixes</td>
            <td style="text-align:center;font-size:15px;color:#d0cce8;">✗</td>
            <td style="text-align:center;font-size:15px;color:#1D9E75;">✓</td>
          </tr>
          <tr style="border-top:1px solid #ebe9f8;">
            <td style="padding:11px 16px;font-size:14px;color:#4a4868;">Connected repos</td>
            <td style="text-align:center;font-size:13px;color:#9590b0;font-family:monospace;">1</td>
            <td style="text-align:center;font-size:13px;color:#534AB7;font-weight:700;font-family:monospace;">5</td>
          </tr>
        </table>
        """
        + f'<p style="margin:0 0 20px;">{_btn("Upgrade to Pro — $18/mo →", "https://www.wrightai.live/pricing")}</p>'
        + _p("No long-term commitment. Cancel any time from your billing portal.", mb=0)
    )
    send_email(
        to,
        f"Wright AI: you've documented {docs_count} functions — here's what Pro adds",
        _wrap(body),
    )


def send_day14_nudge(to: str, docs_count: int) -> None:
    """Day-14 onboarding nudge — more direct upgrade pitch."""
    body = (
        _h2(f"Two weeks, {docs_count} documented functions")
        + _p(
            "If you've used Wright AI for two weeks, you know what it does. "
            "Pro removes the ceiling and adds the features that matter for an active codebase — for less than one lunch."
        )
        + """
        <div style="background:#f5f3ff;border:1px solid #d8d3f5;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
          <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#534AB7;">Pro — $14/month billed annually</p>
          <p style="margin:0;font-size:13px;color:#6b6890;line-height:1.7;">
            1,000 generations &nbsp;·&nbsp; semantic drift &nbsp;·&nbsp; codebase chat &nbsp;·&nbsp; auto-PR &nbsp;·&nbsp; 5 repos &nbsp;·&nbsp; 3 API keys
          </p>
        </div>
        """
        + f'<p style="margin:0 0 20px;">{_btn("Start Pro — cancel any time →", "https://www.wrightai.live/pricing")}</p>'
        + _p(
            'Still not sure? <a href="mailto:surajsahoo19991012@gmail.com" style="color:#534AB7;">Reply to this email</a> — I read every one.',
            mb=0,
        )
    )
    send_email(to, "Two weeks with Wright AI — is Pro right for you?", _wrap(body))


# ---------------------------------------------------------------------------
# Dedup-checked quota alert
# ---------------------------------------------------------------------------


def send_quota_alert(api_key: str, pct: int, used: int, limit: int) -> None:
    """
    Send a quota warning (≥80%) or exceeded (≥100%) email if one hasn't
    already been sent this calendar month. Dedup is tracked in the users
    table via quota_warning_sent_month / quota_exceeded_sent_month columns.
    """
    if not api_key or not api_key.startswith("wai_"):
        return

    try:
        from api.user_store import _db

        db = _db()
        month_key = datetime.now(tz=timezone.utc).strftime("%Y-%m")

        row_result = (
            db.table("users")
            .select("email, quota_warning_sent_month, quota_exceeded_sent_month")
            .eq("api_key", api_key)
            .execute()
        )
        if not row_result.data:
            return

        user = row_result.data[0]
        email: str = user.get("email", "")
        if not email:
            return

        if pct >= 100:
            if user.get("quota_exceeded_sent_month") != month_key:
                send_quota_exceeded(email)
                db.table("users").update({"quota_exceeded_sent_month": month_key}).eq(
                    "api_key", api_key
                ).execute()
        elif pct >= 80:
            if user.get("quota_warning_sent_month") != month_key:
                send_quota_warning(email, used, limit, pct)
                db.table("users").update({"quota_warning_sent_month": month_key}).eq(
                    "api_key", api_key
                ).execute()
    except Exception:
        pass  # Fail-open: never break a quota check because of email issues


# ---------------------------------------------------------------------------
# Daily onboarding drip (triggered via Cloud Scheduler -> internal cron route)
# ---------------------------------------------------------------------------


def run_onboarding_drip() -> dict:
    """
    Daily task: find free-plan users at exactly day 7 or day 14 who have
    generated at least a few docstrings but haven't converted, then send
    the appropriate nudge email.

    Triggered daily via POST /internal/cron/onboarding-drip (Cloud Scheduler).
    """
    try:
        from api.user_store import _db

        db = _db()
        now = datetime.now(tz=timezone.utc)
        sent7 = 0
        sent14 = 0

        for days, col, min_docs, send_fn in [
            (7, "onboarding_day7_sent", 3, send_day7_nudge),
            (14, "onboarding_day14_sent", 5, send_day14_nudge),
        ]:
            cutoff = (now - timedelta(days=days)).date().isoformat()
            result = (
                db.table("users")
                .select("api_key, email")
                .eq("plan", "free")
                .eq(col, False)
                .gte("created_at", f"{cutoff}T00:00:00Z")
                .lt("created_at", f"{cutoff}T23:59:59Z")
                .execute()
            )

            for u in result.data or []:
                docs = _count_all_docs(db, u["api_key"])
                if docs >= min_docs:
                    send_fn(u["email"], docs)
                    db.table("users").update({col: True}).eq("api_key", u["api_key"]).execute()
                    if days == 7:
                        sent7 += 1
                    else:
                        sent14 += 1

        return {"day7_sent": sent7, "day14_sent": sent14, "ok": True}
    except Exception as exc:
        return {"error": str(exc), "ok": False}


def _count_all_docs(db, api_key: str) -> int:
    """Count total lifetime doc generations for a user (all months)."""
    try:
        id_result = db.table("users").select("id").eq("api_key", api_key).execute()
        if not id_result.data:
            return 0
        user_id = id_result.data[0]["id"]
        count_result = (
            db.table("usage_events")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("event_type", "docs_generated")
            .execute()
        )
        return count_result.count or 0
    except Exception:
        return 0
