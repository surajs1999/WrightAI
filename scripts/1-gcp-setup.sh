#!/usr/bin/env bash
set -euo pipefail

# ── Configure these before running ────────────────────────────────────────────
PROJECT_ID="wrightai"          # e.g. wrightai-prod
REGION="asia-southeast1"              # Singapore — matches Fly.io sin region
BUCKET="wrightai-data"                # Replaces Fly volume
SA_NAME="wrightai-cloudrun"           # Service account name
# ──────────────────────────────────────────────────────────────────────────────

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "→ Setting project to $PROJECT_ID"
gcloud config set project "$PROJECT_ID"

echo "→ Enabling required APIs"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  secretmanager.googleapis.com

echo "→ Creating service account: $SA_EMAIL"
gcloud iam service-accounts create "$SA_NAME" \
  --display-name="WrightAI Cloud Run" \
  --project="$PROJECT_ID" || echo "Service account already exists, skipping."

echo "→ Granting storage access (GCS FUSE mount)"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin"

echo "→ Granting Secret Manager access"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

echo "→ Creating GCS bucket: gs://$BUCKET"
gcloud storage buckets create "gs://${BUCKET}" \
  --location="$REGION" \
  --uniform-bucket-level-access || echo "Bucket already exists, skipping."

echo "→ Creating Artifact Registry repository"
gcloud artifacts repositories create wrightai \
  --repository-format=docker \
  --location="$REGION" \
  --description="WrightAI Docker images" || echo "Repository already exists, skipping."

echo "→ Storing API secrets in Secret Manager"
echo "  Enter your ANTHROPIC_API_KEY:"
read -rs ANTHROPIC_KEY
echo -n "$ANTHROPIC_KEY" | gcloud secrets create anthropic-api-key \
  --data-file=- --project="$PROJECT_ID" 2>/dev/null || \
  echo -n "$ANTHROPIC_KEY" | gcloud secrets versions add anthropic-api-key --data-file=-

echo "  Enter your VOYAGE_API_KEY:"
read -rs VOYAGE_KEY
echo -n "$VOYAGE_KEY" | gcloud secrets create voyage-api-key \
  --data-file=- --project="$PROJECT_ID" 2>/dev/null || \
  echo -n "$VOYAGE_KEY" | gcloud secrets versions add voyage-api-key --data-file=-

echo ""
echo "✓ GCP setup complete."
echo "  Project:        $PROJECT_ID"
echo "  Region:         $REGION"
echo "  Bucket:         gs://$BUCKET"
echo "  Service account: $SA_EMAIL"
echo ""
echo "Next: run scripts/2-migrate-data.sh"
