#!/usr/bin/env bash
set -euo pipefail

# Deploys the Next.js web app to Vercel.
# Requires: npm i -g vercel

API_URL="${1:-https://api.wrightai.live}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"

echo "→ Deploying web to Vercel (API URL: $API_URL)"

# Vercel CLI deploy — will prompt for project link on first run
cd "$WEB_DIR"

vercel deploy --prod \
  --env NEXT_PUBLIC_API_URL="$API_URL" \
  --build-env NEXT_PUBLIC_API_URL="$API_URL"

echo ""
echo "✓ Web deployed to Vercel."
echo ""
echo "If this is a first-time deploy, also set NEXT_PUBLIC_API_URL in the"
echo "Vercel dashboard: Project → Settings → Environment Variables"
echo ""
echo "Next: run scripts/5-cutover.sh"
