#!/usr/bin/env bash
set -euo pipefail

# Deploys the Next.js web app to Cloud Run (asia-southeast1).
# Requires: gcloud CLI authenticated, docker
# Env vars required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

PROJECT_ID="wrightai"
REGION="asia-southeast1"
IMAGE="asia-southeast1-docker.pkg.dev/${PROJECT_ID}/wrightai/web:latest"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set."
  exit 1
fi

gcloud config set project "$PROJECT_ID"

echo "→ Authenticating Docker with Artifact Registry"
gcloud auth configure-docker "${REGION}-docker.pkg.dev"

echo "→ Building web Docker image"
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.wrightai.live \
  --build-arg NEXT_PUBLIC_APP_URL=https://wrightai.live \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  -t "$IMAGE" \
  "$WEB_DIR"

echo "→ Pushing image to Artifact Registry"
docker push "$IMAGE"

echo "→ Deploying to Cloud Run"
gcloud run services replace "$ROOT_DIR/cloudrun-web.yaml" \
  --region="$REGION"

echo "→ Allowing unauthenticated access (public web)"
gcloud run services add-iam-policy-binding wrightai-web \
  --region="$REGION" \
  --member="allUsers" \
  --role="roles/run.invoker"

echo ""
WEB_URL=$(gcloud run services describe wrightai-web \
  --region="$REGION" \
  --format="value(status.url)")
echo "✓ Web deployed at: $WEB_URL"
echo ""
echo "Next steps:"
echo "  1. In Cloudflare: add CNAME wrightai.live → $WEB_URL (proxy enabled)"
echo "  2. Or map domain directly in Cloud Run:"
echo "     gcloud run domain-mappings create --service=wrightai-web --domain=wrightai.live --region=$REGION"
echo "  3. Disable Netlify site once DNS is pointed at Cloud Run"

echo ""
echo "Next: run scripts/5-cutover.sh"
