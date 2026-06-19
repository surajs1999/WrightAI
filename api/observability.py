"""
Observability setup: structured JSON logging + Sentry error tracking.
Call setup_observability(app) once, right after FastAPI() is created.

Required env vars:
  SENTRY_DSN        — enables Sentry (get from sentry.io → Project Settings → DSN)

Optional env vars:
  ENVIRONMENT       — "production" / "staging"  (default "production")
  K_REVISION        — Cloud Run revision tag, used as Sentry release identifier
"""

from __future__ import annotations

import logging
import os

_logger = logging.getLogger("wright.observability")


def configure_logging() -> None:
    """Replace the plaintext formatter with JSON so Cloud Logging can parse fields."""
    try:
        from pythonjsonlogger import jsonlogger

        handler = logging.StreamHandler()
        handler.setFormatter(
            jsonlogger.JsonFormatter(
                fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%SZ",
                rename_fields={"levelname": "severity", "asctime": "timestamp"},
            )
        )
        logging.root.setLevel(logging.INFO)
        logging.root.handlers = []
        logging.root.addHandler(handler)
    except ImportError:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s %(levelname)s %(name)s %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )


def _setup_sentry() -> None:
    dsn = os.getenv("SENTRY_DSN", "")
    if not dsn:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration

        sentry_sdk.init(
            dsn=dsn,
            integrations=[
                FastApiIntegration(),
                LoggingIntegration(level=logging.ERROR, event_level=logging.ERROR),
            ],
            traces_sample_rate=0.0,  # no performance tracing — error tracking only
            environment=os.getenv("ENVIRONMENT", "production"),
            release=os.getenv("K_REVISION", "unknown"),
        )
        _logger.info(
            "Sentry initialised", extra={"environment": os.getenv("ENVIRONMENT", "production")}
        )
    except ImportError:
        _logger.warning("sentry-sdk not installed — error tracking disabled")


def setup_observability(app) -> None:  # noqa: ARG001
    """Wire up structured logging and Sentry. Call once after FastAPI() is created."""
    configure_logging()
    _setup_sentry()
