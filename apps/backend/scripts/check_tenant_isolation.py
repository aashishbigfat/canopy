"""
Tenant isolation lint check.

Scans the backend source tree for the unsafe TOCTOU pattern:

    obj = await Model.get(ObjectId(...))      # explicit form
    obj = await Model.get(some_id_var)        # implicit form (id already typed)
    if obj.tenant_id == tenant_id:            # ← too late, already fetched

Both forms load the document without scoping by `tenant_id`, then check
ownership *after* the read. An attacker who can guess or enumerate another
tenant's ObjectIds can confirm their existence and (when the result flows
into other queries) trigger downstream cross-tenant leakage.

The check matches `Model.get(...)` where Model starts with a capital letter
(Beanie convention). Methods on non-Beanie objects (dict.get(), list.get(),
.get() on instances) are filtered out by the leading capital-letter
requirement, but false positives can be silenced via ALLOWLIST.

Safe alternative — scope the query itself:

    obj = await Model.find_one(
        {"_id": oid, "tenant_id": tenant_id, "deleted_at": None}
    )

Exit code:
    0 — no unsafe occurrences (or only allowlisted ones)
    1 — one or more unsafe occurrences found

Run from the backend root:
    python scripts/check_tenant_isolation.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Iterable, List, Tuple

# Files where `Model.get(...)` is intentionally global-scope (no tenant_id on
# the model) or is the trusted JWT identity bootstrap. Keep this allowlist
# tight — every addition needs justification in a comment.
ALLOWLIST = {
    "app/services/country_service.py",       # Country is global, no tenant_id
    "app/middleware/industry_guard.py",      # Loads the user's OWN tenant (trusted JWT bootstrap)
    "app/models/user.py",                    # Docstring mentions the pattern in a code-comment
}

# Match `<CapitalName>.get(...)` — Beanie Document classes are by convention
# PascalCase. Allows both `Model.get(ObjectId(id))` and `Model.get(id_var)`.
# Negative-lookbehind on `dict|list|self|cls|os|sys` to skip well-known
# non-Beanie .get callsites that happen to start uppercased nowhere — actually
# Beanie models always start uppercase and instance methods on those models
# wouldn't begin with a capital letter at the call site, so this is enough.
PATTERN = re.compile(r"\b[A-Z][A-Za-z0-9_]*\.get\(\s*[A-Za-z_]")

# Method names / class names that are NOT Beanie's Document.get — skip
# these false positives. Substring match against the stripped line.
SAFE_CALLSITES = (
    # ── Constant / dict lookups (Python dict.get, not Beanie) ─────────
    ".LABELS.get(",
    "DEFAULT_",
    "_DEFAULTS.get(",
    "_MAP.get(",
    "_REGISTRY",
    "_STRATEGIES.get(",
    "_VALIDATORS.get(",
    "INDUSTRY_",
    "SUPPORTED_",
    # ── Framework helpers ─────────────────────────────────────────────
    "Limiter.get(",
    "Settings.get(",
    "ContextVar.get(",
    "FastAPICache.get(",
    "Counter.get(",
    "Logger.get(",
    # ── Common cls/self-style class-method calls that aren't Beanie ───
    "cls.get(",
    # ── Tenant.get(tenant_id) is the trusted root lookup — tenants ARE the
    #    scope; there's nothing higher to scope by. The tenant_id always
    #    comes from the authenticated user's JWT.
    "Tenant.get(",
    # ── Platform-global picklists / catalogs with no tenant_id field.
    #    Every tenant sees the same rows; cross-tenant scoping doesn't apply.
    "SubscriptionPlan.get(",
    "Country.get(",
)

BACKEND_ROOT = Path(__file__).resolve().parent.parent  # apps/backend
APP_ROOT = BACKEND_ROOT / "app"


def scan() -> List[Tuple[Path, int, str]]:
    hits: List[Tuple[Path, int, str]] = []
    for py_file in APP_ROOT.rglob("*.py"):
        rel = py_file.relative_to(BACKEND_ROOT).as_posix()
        if rel in ALLOWLIST:
            continue
        try:
            text = py_file.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for lineno, line in enumerate(text.splitlines(), start=1):
            if not PATTERN.search(line):
                continue
            # Strip whitespace + skip comments
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            # Skip known non-Beanie callsites
            if any(safe in stripped for safe in SAFE_CALLSITES):
                continue
            hits.append((py_file, lineno, stripped))
    return hits


def main() -> int:
    hits = scan()
    if not hits:
        print("OK: no unsafe Model.get(...) patterns found.")
        return 0

    print("FAIL: unsafe Model.get(...) calls detected.")
    print("Replace each with a tenant-scoped .find_one({_id, tenant_id, ...}).")
    print()
    for path, lineno, line in hits:
        rel = path.relative_to(BACKEND_ROOT).as_posix()
        print(f"  {rel}:{lineno}: {line}")
    print()
    print(f"Total: {len(hits)} occurrence(s).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
