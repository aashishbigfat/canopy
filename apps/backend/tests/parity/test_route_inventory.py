"""
Sprint G — parity inventory test.

Asserts that for every old Laravel route in
`docs/parity/old_routes.csv`, the new FastAPI app exposes either:

  - an exact-match path (after normalising `{id}` placeholders),
  - a fuzzy-match path (≥0.5 token overlap on the same HTTP method), or
  - the route is explicitly marked `decommissioned` in
    `apps/backend/MIGRATION.md`.

This test is the gate for declaring 100% parity.
"""
from __future__ import annotations
import csv
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[4]
OLD_CSV = ROOT / "Tutterfly-main" / "docs" / "parity" / "old_routes.csv"
LEDGER = ROOT / "Tutterfly-main" / "apps" / "backend" / "MIGRATION.md"


def _load_old_routes() -> list[dict]:
    rows = []
    with OLD_CSV.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append(row)
    return rows


def _load_decommissioned() -> set[tuple[str, str]]:
    """Pull rows from MIGRATION.md flagged status=decommissioned."""
    if not LEDGER.exists():
        return set()
    out = set()
    text = LEDGER.read_text(encoding="utf-8", errors="ignore")
    for line in text.splitlines():
        if "decommissioned" not in line:
            continue
        m = re.match(r"\|\s*[\d?]+\s*\|\s*(\w+)\s*\|\s*`([^`]+)`", line)
        if m:
            out.add((m.group(1), m.group(2)))
    return out


def _new_routes_set() -> tuple[set[tuple[str, str]], list[dict]]:
    new_csv = ROOT / "Tutterfly-main" / "docs" / "parity" / "new_routes.csv"
    if not new_csv.exists():
        return set(), []
    exact = set()
    rows = []
    with new_csv.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            path = re.sub(r"\{[^}]+\}", "{id}", row["path"].lower())
            path = path.replace("/api/v1", "")
            exact.add((row["method"], path))
            rows.append({"method": row["method"], "path": path})
    return exact, rows


def _tokens(p: str) -> set[str]:
    return {t for t in re.split(r"[/_\-]", p) if t and t not in ("rest", "{id}")}


def _normalise(p: str) -> str:
    return re.sub(r"\{[^}]+\}", "{id}", p.lower())


def _match(method: str, path: str, exact: set, new_rows: list[dict]) -> bool:
    norm = _normalise(path)
    if (method, norm) in exact:
        return True
    otoks = _tokens(norm)
    if not otoks:
        return False
    for nr in new_rows:
        if nr["method"] != method:
            continue
        ntoks = _tokens(nr["path"])
        if not (otoks & ntoks):
            continue
        score = len(otoks & ntoks) / max(len(otoks | ntoks), 1)
        if score >= 0.5:
            return True
    return False


@pytest.mark.parity
def test_every_old_route_has_match_or_decommission():
    rows = _load_old_routes()
    exact, new_rows = _new_routes_set()
    decommissioned = _load_decommissioned()

    missing = []
    for r in rows:
        method = r["method"]
        path = r["path"]
        if (method, path) in decommissioned:
            continue
        if _match(method, path, exact, new_rows):
            continue
        missing.append(f"{method} {path}")

    assert not missing, (
        f"\n{len(missing)} old routes are still missing in new app. "
        "Either implement them or mark `decommissioned` in MIGRATION.md.\n"
        + "\n".join(missing[:50])
        + (f"\n…and {len(missing) - 50} more" if len(missing) > 50 else "")
    )
