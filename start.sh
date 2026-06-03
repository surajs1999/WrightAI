#!/bin/bash
set -e

# API-only entrypoint.
# Celery worker + Beat run in the separate wrightai-worker Cloud Run service
# (see cloudrun-worker.yaml). Both services share the same Redis broker.
exec uvicorn api.main:app --host 0.0.0.0 --port 8080 --log-level info
