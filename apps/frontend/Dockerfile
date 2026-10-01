# Tutterfly frontend (Next.js standalone server). Deployed on Google Cloud Run.
#
# The build context is the REPO ROOT: npm workspaces hoist dependencies into the
# root node_modules and the lockfile lives at the root.
#
#   docker build -f apps/frontend/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api/v1 \
#     -t tutterfly-frontend .
#   docker run --rm -p 3000:3000 \
#     -e NEXTAUTH_SECRET=... -e NEXTAUTH_URL=http://localhost:3000 tutterfly-frontend

ARG NODE_IMAGE=node:22-bookworm-slim

# ── Stage 1: install dependencies and build ──────────────────────────────────
FROM ${NODE_IMAGE} AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/
RUN npm ci --no-audit --no-fund

COPY apps/frontend apps/frontend

# NEXT_PUBLIC_* values are inlined into the bundles at build time, so the API URL
# is a build argument — changing it means rebuilding the image.
ARG NEXT_PUBLIC_API_URL
RUN test -n "$NEXT_PUBLIC_API_URL" \
    || (echo "ERROR: --build-arg NEXT_PUBLIC_API_URL=https://<backend>/api/v1 is required" >&2 && exit 1)
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_STANDALONE=true

RUN npm run build --workspace=apps/frontend

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

# Cloud Run overrides PORT (8080); the standalone server reads PORT and HOSTNAME.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=builder --chown=node:node /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=node:node /app/apps/frontend/public ./apps/frontend/public

USER node

EXPOSE 3000

CMD ["node", "apps/frontend/server.js"]
