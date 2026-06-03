from __future__ import annotations

import ssl
import os

from celery import Celery

_redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_ssl_opts: dict = {}
if _redis_url.startswith("rediss://"):
    _ssl_opts = {
        "broker_use_ssl": {"ssl_cert_reqs": ssl.CERT_NONE},
        "redis_backend_use_ssl": {"ssl_cert_reqs": ssl.CERT_NONE},
    }

celery_app = Celery("wright", broker=_redis_url, backend=_redis_url, **_ssl_opts)

celery_app.conf.task_track_started = True
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]
celery_app.conf.timezone = "UTC"

celery_app.autodiscover_tasks(["api.tasks"])

# ---------------------------------------------------------------------------
# Celery Beat schedule — periodic tasks
# ---------------------------------------------------------------------------

celery_app.conf.beat_schedule = {
    # Runs daily: sends day-7 and day-14 onboarding nudges to active free users
    "daily-onboarding-drip": {
        "task": "email.onboarding_drip",
        "schedule": 86400,  # seconds
    },
}
