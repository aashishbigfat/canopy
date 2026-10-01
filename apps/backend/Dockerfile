# Tutterfly backend (FastAPI). Deployed on Google Cloud Run; also runs under the
# docker-compose host. Listens on $PORT (Cloud Run injects 8080; default 8000).
#
#   docker build -t tutterfly-backend apps/backend
#   docker run --rm -p 8000:8000 --env-file apps/backend/.env tutterfly-backend

# ── Stage 1: build the virtualenv (compilers stay in this stage) ─────────────
FROM python:3.11-slim-bookworm AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libffi-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install uv && python -m venv /opt/venv

COPY requirements.txt .
RUN uv pip install --python /opt/venv/bin/python --no-cache -r requirements.txt

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM python:3.11-slim-bookworm

LABEL org.opencontainers.image.source="https://github.com/bigfat-ai-labs/tutterfly"
LABEL org.opencontainers.image.description="Tutterfly Backend API"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8000

# Shared libraries WeasyPrint loads at runtime (Pango/HarfBuzz/Cairo) + a base font.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libpangocairo-1.0-0 \
        libharfbuzz0b \
        libcairo2 \
        libgdk-pixbuf-2.0-0 \
        libffi8 \
        shared-mime-info \
        fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Non-root user. /app stays writable: LocalFileService writes ./uploads when S3
# isn't configured (ephemeral on Cloud Run — configure S3 in production).
RUN useradd --create-home --uid 10001 app \
    && mkdir -p /app/uploads \
    && chown -R app:app /app
WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --chown=app:app . .

USER app

EXPOSE 8000

# Used by docker/compose; Cloud Run ignores HEALTHCHECK and probes the port itself.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/health' % os.environ.get('PORT', '8000'), timeout=4)" || exit 1

# Shell form so $PORT / $WEB_CONCURRENCY expand at runtime; `exec` makes uvicorn
# PID 1 so it receives SIGTERM and shuts down gracefully. Size WEB_CONCURRENCY to
# the instance (Cloud Run deploy sets 2 per vCPU); Redis keeps workers' caches coherent.
CMD exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --proxy-headers --forwarded-allow-ips "*" --workers "${WEB_CONCURRENCY:-4}"
