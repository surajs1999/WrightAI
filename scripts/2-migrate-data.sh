#!/usr/bin/env bash
set -euo pipefail

# ── Configure these before running ────────────────────────────────────────────
PROJECT_ID="wrightai"
BUCKET="wrightai-data"
FLY_APP="wrightai-api"
TMP_DIR="/tmp/wright-fly-backup"
# ──────────────────────────────────────────────────────────────────────────────

echo "→ Downloading /data from Fly volume (this may take a few minutes)"
mkdir -p "$TMP_DIR"

# Stream a tar archive from the running Fly machine to local disk
fly ssh console -a "$FLY_APP" -C "tar -czf - /data 2>/dev/null" > "$TMP_DIR/data.tar.gz"

echo "→ Extracting archive"
tar -xzf "$TMP_DIR/data.tar.gz" -C "$TMP_DIR"

echo "→ Uploading to gs://$BUCKET"
gcloud config set project "$PROJECT_ID"
gsutil -m cp -r "$TMP_DIR/data/." "gs://${BUCKET}/"

echo "→ Cleaning up local temp files"
rm -rf "$TMP_DIR"

echo ""
echo "✓ Data migration complete. Contents of gs://$BUCKET:"
gsutil ls "gs://${BUCKET}/"
echo ""
echo "Next: run scripts/3-deploy-api.sh"
