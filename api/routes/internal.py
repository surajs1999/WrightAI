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
