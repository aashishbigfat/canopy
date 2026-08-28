# Use an official Python runtime as a parent image
FROM python:3.11-slim

LABEL org.opencontainers.image.source="https://github.com/bigfat-ai-labs/tutterfly"
LABEL org.opencontainers.image.description="Tutterfly Backend API"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies for WeasyPrint and other packages
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    libpangocairo-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install uv and Python deps with cache mount for faster rebuilds
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/uv \
    pip install --no-cache-dir uv \
    && uv pip install --system --no-cache -r requirements.txt \
    && pip install --no-cache-dir jinja2

# Copy project
COPY . .

# Expose port
EXPOSE 8000

# Command to run the application.
# PERF: run multiple worker processes so one slow request can't block all
# others (was a single process). Worker count is configurable via WEB_CONCURRENCY
# (default 4); size it to roughly 2*CPU+1 for the deploy host. Redis is the
# shared cache/rate-limit store, so workers stay coherent.
# Shell form is used intentionally so ${WEB_CONCURRENCY} is expanded at runtime.
CMD uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips "*" --workers ${WEB_CONCURRENCY:-4}
