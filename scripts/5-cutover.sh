#!/usr/bin/env bash
set -euo pipefail

# ── Configure these before running ────────────────────────────────────────────
PROJECT_ID="wrightai"
REGION="asia-southeast1"
FLY_API_APP="wrightai-api"
FLY_WEB_APP="wrightai-web"
API_URL="https://api.wrightai.live"
# ──────────────────────────────────────────────────────────────────────────────

echo "=== Pre-cutover smoke tests ==="

echo "→ API health check"
curl -sf "${API_URL}/health" && echo " ✓" || { echo " ✗ API not healthy — aborting"; exit 1; }

echo ""
echo "=== Map custom domain api.wrightai.live → Cloud Run ==="
gcloud run domain-mappings create \
  --service=wrightai-api \
  --domain=api.wrightai.live \
  --region="$REGION" \
  --project="$PROJECT_ID" 2>/dev/null || echo "Domain mapping already exists."

echo ""
echo "→ DNS records to add at your registrar:"
gcloud run domain-mappings describe \
  --domain=api.wrightai.live \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="table(status.resourceRecords[].name, status.resourceRecords[].type, status.resourceRecords[].rrdata)"

echo ""
echo "=== Decommission Fly.io (only run after DNS has propagated) ==="
read -rp "Has DNS propagated and the custom domain verified? (yes/no): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "Skipping Fly.io decommission. Re-run after DNS is ready."
  exit 0
fi

echo "→ Destroying Fly apps"
fly apps destroy "$FLY_API_APP" --yes
fly apps destroy "$FLY_WEB_APP" --yes

echo ""
echo "→ Listing remaining Fly volumes (delete manually if any remain):"
fly volumes list -a "$FLY_API_APP" 2>/dev/null || echo "  (none)"

echo ""
echo "✓ Cutover complete. Fly.io decommissioned."
echo "  API: $API_URL"
echo "  Web: Vercel dashboard"
