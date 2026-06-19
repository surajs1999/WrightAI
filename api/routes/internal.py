from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Header, HTTPException

router = APIRouter(prefix="/internal", tags=["internal"])


def _verify_cron_secret(x_cron_secret: str = Header(default="")) -> None:
    """Require the shared-secret header Cloud Scheduler sends with cron requests."""
    expected = os.getenv("CRON_SECRET", "")
    if not expected or x_cron_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing cron secret")


@router.post("/cron/onboarding-drip", dependencies=[Depends(_verify_cron_secret)])
async def onboarding_drip_cron() -> dict:
    """Daily Cloud Scheduler entrypoint: send day-7/day-14 onboarding nudge emails."""
    from api.tasks.email_tasks import run_onboarding_drip

    return run_onboarding_drip()


@router.post("/cron/ops-alert", dependencies=[Depends(_verify_cron_secret)])
async def ops_alert_cron() -> dict:
    """
    Hourly Cloud Scheduler entrypoint: check for LLM anomalies in the last 24 h
    and email hello@wrightai.live if any thresholds are breached.

    Recommended schedule: every hour (0 * * * *)
    Required env vars: CRON_SECRET, BREVO_API_KEY
    Optional thresholds: OPS_FALLBACK_RATE_THRESHOLD, OPS_HIGH_RETRY_THRESHOLD,
                         OPS_LATENCY_MS_THRESHOLD, OPS_MIN_CALLS_THRESHOLD
    """
    from api.tasks.ops_alerts import run_ops_alert_check

    return run_ops_alert_check()
