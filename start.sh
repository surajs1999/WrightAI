#!/bin/bash
set -e

# API-only entrypoint.
# Celery worker + Beat run in the separate wrightai-worker Cloud Run service
# (see cloudrun-worker.yaml). Both services share the same Redis broker.

# Copy ChromaDB from GCS Fuse (/data/chroma) to local NVMe (/tmp/chroma) so all
# subsequent reads and writes happen on fast local disk with no GCS Fuse overhead.
# Runs once per container start; Cloud Run health checks won't pass until uvicorn
# is up, so traffic is held until this completes.
if [ -d "/data/chroma" ]; then
    echo "[startup] Warming up ChromaDB: /data/chroma → /tmp/chroma"
    cp -r /data/chroma /tmp/chroma || echo "[startup] ChromaDB warm-up failed — starting cold"
    echo "[startup] ChromaDB warm-up done"
fi

exec uvicorn api.main:app --host 0.0.0.0 --port 8080 --log-level info
