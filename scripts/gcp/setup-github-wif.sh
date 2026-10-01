#!/usr/bin/env bash
# One-time GCP setup so GitHub Actions can deploy to Cloud Run without any
# long-lived key (Workload Identity Federation).
#
# Creates: required APIs, an Artifact Registry repo, a deployer service account,
# a workload identity pool + GitHub OIDC provider, and the impersonation binding
# restricted to one GitHub repository.
#
# Usage:  bash scripts/gcp/setup-github-wif.sh
# Re-running is safe: existing resources are left as they are.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-asia-south1}"
GITHUB_REPO="${GITHUB_REPO:-aashishbigfat/canopy}"
AR_REPO="${AR_REPO:-tutterfly}"
SA_NAME="${SA_NAME:-tutterfly-deployer}"
# Reuses the project's existing pool. The provider and the service account are
# dedicated to this repo, so the shared github-deployer account (which holds
# compute.instanceAdmin for the dookwebsite/dookblog deploys) is not involved.
POOL="${POOL:-github-pool}"
PROVIDER="${PROVIDER:-canopy-github}"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

echo "Project:      $PROJECT_ID ($PROJECT_NUMBER)"
echo "Region:       $REGION"
echo "GitHub repo:  $GITHUB_REPO"
echo

echo "==> Enabling APIs"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  --project "$PROJECT_ID"

echo "==> Artifact Registry repository: $AR_REPO"
gcloud artifacts repositories describe "$AR_REPO" --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1 \
  || gcloud artifacts repositories create "$AR_REPO" \
       --repository-format=docker --location "$REGION" \
       --description="Tutterfly container images" --project "$PROJECT_ID"

echo "==> Deployer service account: $SA_EMAIL"
gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID" >/dev/null 2>&1 \
  || gcloud iam service-accounts create "$SA_NAME" \
       --display-name="GitHub Actions deployer" --project "$PROJECT_ID"

# run.admin: deploy revisions. artifactregistry.writer: push images.
# iam.serviceAccountUser: let the deploy set the services' runtime service account.
for ROLE in roles/run.admin roles/artifactregistry.writer roles/iam.serviceAccountUser; do
  echo "    granting $ROLE"
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" --role="$ROLE" --condition=None --quiet >/dev/null
done

echo "==> Workload identity pool: $POOL (reused if it already exists)"
gcloud iam workload-identity-pools describe "$POOL" --location=global --project "$PROJECT_ID" >/dev/null 2>&1 \
  || gcloud iam workload-identity-pools create "$POOL" \
       --location=global --display-name="GitHub Actions" --project "$PROJECT_ID"

echo "==> OIDC provider: $PROVIDER"
# attribute-condition is the security boundary: only this GitHub repository may
# use the provider. Without it, any repository on github.com could authenticate.
gcloud iam workload-identity-pools providers describe "$PROVIDER" \
  --location=global --workload-identity-pool="$POOL" --project "$PROJECT_ID" >/dev/null 2>&1 \
  || gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
       --location=global \
       --workload-identity-pool="$POOL" \
       --display-name="GitHub Actions OIDC" \
       --issuer-uri="https://token.actions.githubusercontent.com" \
       --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
       --attribute-condition="assertion.repository=='$GITHUB_REPO'" \
       --project "$PROJECT_ID"

echo "==> Allowing $GITHUB_REPO to impersonate $SA_EMAIL"
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository/$GITHUB_REPO" \
  --project "$PROJECT_ID" --quiet >/dev/null

PROVIDER_PATH="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER"

cat <<OUT

Done. Set these in GitHub ($GITHUB_REPO):

  gh secret set GCP_WIF_PROVIDER    --repo $GITHUB_REPO --body '$PROVIDER_PATH'
  gh secret set GCP_SERVICE_ACCOUNT --repo $GITHUB_REPO --body '$SA_EMAIL'
  gh secret set GCP_PROJECT_ID      --repo $GITHUB_REPO --body '$PROJECT_ID'
  gh variable set GCP_REGION        --repo $GITHUB_REPO --body '$REGION'
  gh variable set NEXT_PUBLIC_API_URL --repo $GITHUB_REPO --body 'https://<backend-host>/api/v1'

Still required before the first deploy — Secret Manager secrets holding your own
values (see docs/DEPLOY_GCP.md): tutterfly-mongodb-url, tutterfly-secret-key,
tutterfly-nextauth-secret.
OUT
