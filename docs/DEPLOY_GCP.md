# Deploying to Google Cloud (Cloud Run)

Tutterfly runs as two Cloud Run services built from the Dockerfiles in this repo.

| Service | What | Dockerfile | Build context |
|---|---|---|---|
| `tutterfly-backend` | FastAPI API | `apps/backend/Dockerfile` | `apps/backend` |
| `tutterfly-frontend` | Next.js standalone server | `apps/frontend/Dockerfile` | repo root (npm workspaces) |

`cloudbuild.yaml` builds both images, pushes them to Artifact Registry and deploys them.
MongoDB stays external (Atlas). Redis is optional but recommended (Memorystore).

## One-time setup

```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
REGION=asia-south1
```

**1. APIs, registry, and GitHub trust** — run the setup script, which is safe to re-run:

```bash
bash scripts/gcp/setup-github-wif.sh
```

**2. Secrets** (Secret Manager — never bake `.env` files into images)

```bash
printf '%s' 'mongodb+srv://USER:PASS@CLUSTER/tutterfly_crm' | gcloud secrets create tutterfly-mongodb-url --data-file=-
openssl rand -hex 32 | tr -d '\n' | gcloud secrets create tutterfly-secret-key --data-file=-
openssl rand -base64 32 | tr -d '\n' | gcloud secrets create tutterfly-nextauth-secret --data-file=-
```

Reuse the current production `SECRET_KEY` instead if existing logins should survive the move.

Let the Cloud Run runtime service account read them:

```bash
RUNTIME_SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
for s in tutterfly-mongodb-url tutterfly-secret-key tutterfly-nextauth-secret; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:$RUNTIME_SA" --role=roles/secretmanager.secretAccessor
done
```

**3. GitHub secrets and variables.** Set the values the script prints (table under
[Deploy](#deploy)). Only needed if you also build from a workstation with `cloudbuild.yaml`:
the Cloud Build service account needs `roles/run.admin`, `roles/iam.serviceAccountUser`,
`roles/artifactregistry.writer` and `roles/logging.logWriter`.

## Deploy

Pushes to `main` that touch `apps/**` deploy both services via
[.github/workflows/deploy-gcp.yml](../.github/workflows/deploy-gcp.yml). The workflow
authenticates with Workload Identity Federation (no stored key), builds both images on the
runner, pushes them to Artifact Registry and rolls out Cloud Run. "Run workflow" in the
Actions tab can deploy just the backend or just the frontend.

`scripts/gcp/setup-github-wif.sh` performs the GCP half of that setup once: APIs, the
`tutterfly` Artifact Registry repo, a `tutterfly-deployer` service account (Cloud Run +
registry only), and a `canopy-github` OIDC provider in the existing `github-pool` that trusts
only the `aashishbigfat/canopy` repository. It leaves the shared `github-deployer` account used
by the dookwebsite/dookblog deploys alone.

GitHub configuration it prints — secrets under Settings → Secrets → Actions, variables under
Settings → Variables:

| Name | Kind | Value |
|---|---|---|
| `GCP_WIF_PROVIDER` | secret | `projects/<number>/locations/global/workloadIdentityPools/github-pool/providers/canopy-github` |
| `GCP_SERVICE_ACCOUNT` | secret | `tutterfly-deployer@<project>.iam.gserviceaccount.com` |
| `GCP_PROJECT_ID` | secret | the project id |
| `GCP_REGION` | variable | `asia-south1` (the workflow defaults to this) |
| `NEXT_PUBLIC_API_URL` | variable | `https://<backend-host>/api/v1` — compiled into the frontend bundle |

`cloudbuild.yaml` does the same build and deploy from a workstation
(`gcloud builds submit --config cloudbuild.yaml --substitutions=_NEXT_PUBLIC_API_URL=...`),
which is useful for the very first deploy or when Actions is unavailable.

`<backend-host>` is the custom domain you will map to the backend, or its Cloud Run URL,
which is predictable before the first deploy:
`tutterfly-backend-$PROJECT_NUMBER.$REGION.run.app`. Changing it later means rebuilding
the frontend image.

After the **first** deploy, make both services public and wire up the URLs
(`<frontend-url>` is e.g. `https://tutterfly-frontend-$PROJECT_NUMBER.$REGION.run.app`):

```bash
for svc in tutterfly-backend tutterfly-frontend; do
  gcloud run services add-iam-policy-binding "$svc" --region="$REGION" \
    --member=allUsers --role=roles/run.invoker
done

gcloud run services update tutterfly-backend --region="$REGION" \
  --update-env-vars='^@^CORS_ORIGINS=<frontend-url>@FRONTEND_URL=<frontend-url>@MONGODB_DB_NAME=tutterfly_crm'

gcloud run services update tutterfly-frontend --region="$REGION" \
  --update-env-vars=NEXTAUTH_URL=<frontend-url>
```

Env vars and secrets set this way survive later deploys.

## Production checklist

- **File uploads.** Without S3 credentials the backend writes uploads to the container disk,
  which Cloud Run discards. Add `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` as secrets and set
  `S3_BUCKET_NAME` / `S3_PDF_BUCKET` / `AWS_REGION` on `tutterfly-backend`.
- **Redis.** Without it every instance and worker keeps its own cache and rate-limit counters
  (the backend logs a critical warning at startup in production). Create a Memorystore instance
  and attach the service to its VPC:
  `gcloud run services update tutterfly-backend --region="$REGION" --network=default --subnet=default --vpc-egress=private-ranges-only --update-env-vars=REDIS_URL=redis://<memorystore-ip>:6379/0`
- **MongoDB Atlas network access.** Cloud Run egress IPs are not fixed. Either route egress through
  Cloud NAT with a reserved static IP (`--vpc-egress=all-traffic`) and allowlist that IP in Atlas,
  or allow `0.0.0.0/0` with strong credentials.
- **Celery worker.** Account view tracking and owner-change emails are queued with `.delay()` and
  need Redis plus a worker. Run the backend image with
  `celery -A app.tasks.account_tasks.celery_app worker --loglevel=info`
  as a Cloud Run worker pool (or a small Compute Engine VM). Without a worker these jobs don't run.
- **Other integrations** (SMTP, Twilio, Stripe, Sentry, Meta webhooks, website capture): add the
  variables from `apps/backend/.env.example` with `--update-env-vars` / `--update-secrets`.
- **Sizing.** The backend deploys with 1 vCPU / 1 GiB and `WEB_CONCURRENCY=2` uvicorn workers.
  Add `--min-instances=1` to avoid cold starts on the first request.

## Running the images locally

```bash
docker build -t tutterfly-backend apps/backend
docker run --rm -p 8000:8000 --env-file apps/backend/.env tutterfly-backend

docker build -f apps/frontend/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://host.docker.internal:8000/api/v1 -t tutterfly-frontend .
docker run --rm -p 3000:3000 -e NEXTAUTH_SECRET=dev -e NEXTAUTH_URL=http://localhost:3000 tutterfly-frontend
```

Check which database `apps/backend/.env` points at before running the backend image.
`host.docker.internal` resolves from both the browser and the container on Docker Desktop; on Linux
use `--network host` and `http://localhost:8000/api/v1`.
