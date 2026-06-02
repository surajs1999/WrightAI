#!/usr/bin/env bash
set -euo pipefail

# ── Configure these before running ────────────────────────────────────────────
PROJECT_ID="wrightai"
REGION="asia-southeast1"
SA_NAME="wrightai-cloudrun"
IMAGE="asia-southeast1-docker.pkg.dev/${PROJECT_ID}/wrightai/api:latest"
# ──────────────────────────────────────────────────────────────────────────────

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

gcloud config set project "$PROJECT_ID"

echo "→ Authenticating Docker with Artifact Registry"
gcloud auth configure-docker "${REGION}-docker.pkg.dev"

echo "→ Building API Docker image"
docker build -t "$IMAGE" "$ROOT_DIR"

echo "→ Pushing image to Artifact Registry"
docker push "$IMAGE"

echo "→ Substituting PROJECT_ID in cloudrun-api.yaml"
sed "s/PROJECT_ID/${PROJECT_ID}/g" "$ROOT_DIR/cloudrun-api.yaml" > /tmp/cloudrun-api-resolved.yaml

echo "→ Deploying to Cloud Run"
gcloud run services replace /tmp/cloudrun-api-resolved.yaml \
  --region="$REGION"

echo "→ Allowing unauthenticated access (public API)"
gcloud run services add-iam-policy-binding wrightai-api \
  --region="$REGION" \
  --member="allUsers" \
  --role="roles/run.invoker"

echo ""
API_URL=$(gcloud run services describe wrightai-api \
  --region="$REGION" \
  --format="value(status.url)")
echo "✓ API deployed at: $API_URL"
echo ""
echo "→ Verifying health check"
curl -sf "${API_URL}/health" && echo " — healthy" || echo " — WARNING: health check failed"

echo ""
echo "Next steps:"
echo "  1. Map custom domain: gcloud run domain-mappings create --service=wrightai-api --domain=api.wrightai.live --region=$REGION"
echo "  2. Run scripts/4-deploy-web.sh"
