"""
Centralized logging configuration.

In development: human-readable text on stdout.
In production: JSON lines on stdout (parseable by Datadog / CloudWatch / Loki).

JSON format includes timestamp, level, logger name, message, and any extra
fields passed to the logger. Sentry separately captures `error` and above via
its own integration.

A custom filter strips fields commonly used to carry secrets (`password`,
`token`, `access_token`, `authorization`, etc.) from log records — so even if
a developer accidentally logs a dict containing a token, it gets redacted
before hitting stdout.
"""
from __future__ import annotations

import logging
import sys
from typing import Iterable

_SENSITIVE_KEYS: tuple[str, ...] = (
    "password",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "api_key",
    "secret",
    "smtp_password",
)


class _RedactingFilter(logging.Filter):
    """Redact sensitive values from log record `args` and `extra` fields."""

    def filter(self, record: logging.LogRecord) -> bool:
        # Redact dict args (e.g., logger.info("...", {"password": "x"}))
        if isinstance(record.args, dict):
            record.args = self._redact_mapping(record.args)
        # Redact tuple args containing dicts
        elif isinstance(record.args, tuple):
            new_args = tuple(
                self._redact_mapping(a) if isinstance(a, dict) else a
                for a in record.args
            )
            record.args = new_args

        # Redact extra fields set via logger.info("...", extra={...})
        for key in list(vars(record).keys()):
            if key.lower() in _SENSITIVE_KEYS:
                setattr(record, key, "[REDACTED]")
        return True

    @staticmethod
    def _redact_mapping(d: dict) -> dict:
        out = {}
        for k, v in d.items():
            if isinstance(k, str) and k.lower() in _SENSITIVE_KEYS:
                out[k] = "[REDACTED]"
            elif isinstance(v, dict):
                out[k] = _RedactingFilter._redact_mapping(v)
            else:
                out[k] = v
        return out


def configure_logging(environment: str, level: str = "INFO") -> None:
    """Configure root logger. Idempotent — safe to call multiple times.

    `environment` is the deployment env name (e.g. "development", "production").
    JSON output is used everywhere except development/testing.
    """
    root = logging.getLogger()

    # Clear default handlers so we don't double-log
    for h in list(root.handlers):
        root.removeHandler(h)

    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(_RedactingFilter())

    use_json = environment not in ("development", "testing", "test")
    if use_json:
        try:
            from pythonjsonlogger import jsonlogger

            formatter = jsonlogger.JsonFormatter(
                fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
                rename_fields={"levelname": "level", "asctime": "timestamp"},
            )
        except Exception:
            # If python-json-logger isn't installed, fall back to text format
            formatter = logging.Formatter(
                "%(asctime)s %(levelname)s %(name)s %(message)s"
            )
    else:
        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        )

    handler.setFormatter(formatter)
    root.addHandler(handler)
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Tame chatty third-party loggers
    for noisy in ("uvicorn.access", "passlib", "asyncio"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


__all__ = ["configure_logging"]
