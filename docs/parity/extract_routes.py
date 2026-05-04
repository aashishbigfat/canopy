"""
Static route extractor for parity audit.

Parses:
  OLD  -> tfc8old/tfc/routes/api.php  (Laravel)
  NEW  -> Tutterfly-main/apps/backend/app/api/v1/*.py + app/main.py prefixes (FastAPI)

Outputs:
  docs/parity/old_routes.csv
  docs/parity/new_routes.csv
  docs/parity/diff.md
"""

from __future__ import annotations
import re
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OLD_API = ROOT / "tfc8old" / "tfc" / "routes" / "api.php"
NEW_BACKEND = ROOT / "Tutterfly-main" / "apps" / "backend" / "app"
OUT_DIR = ROOT / "Tutterfly-main" / "docs" / "parity"
OUT_DIR.mkdir(parents=True, exist_ok=True)


# ---------- OLD (Laravel) ----------

LARAVEL_VERB_RE = re.compile(
    r"Route::(get|post|put|patch|delete|options|any)\(\s*['\"]([^'\"]+)['\"]\s*,"
    r"\s*(?:\[\s*([A-Za-z_0-9\\]+)::class\s*,\s*['\"]([^'\"]+)['\"]\s*\]|"
    r"\s*['\"]([^'\"]+)['\"]|"
    r"\s*function)",
    re.MULTILINE,
)
LARAVEL_RESOURCE_RE = re.compile(
    r"Route::(?:resource|apiResource)\(\s*['\"]([^'\"]+)['\"]\s*,\s*([A-Za-z_0-9\\]+)::class",
    re.MULTILINE,
)
LARAVEL_GROUP_RE = re.compile(
    r"Route::group\(\s*\[(.*?)\]\s*,\s*function",
    re.DOTALL,
)

# Resource controller -> 7 standard routes
RESOURCE_TEMPLATE = [
    ("GET",    "{base}",            "index"),
    ("POST",   "{base}",            "store"),
    ("GET",    "{base}/{{id}}",     "show"),
    ("PUT",    "{base}/{{id}}",     "update"),
    ("PATCH",  "{base}/{{id}}",     "update"),
    ("DELETE", "{base}/{{id}}",     "destroy"),
]


def parse_laravel(path: Path) -> list[dict]:
    src = path.read_text(encoding="utf-8", errors="ignore")
    # strip line comments
    src_clean = re.sub(r"^\s*//.*$", "", src, flags=re.MULTILINE)
    routes: list[dict] = []

    # Detect prefix groups (admin, api_key etc.) — track [start, end] braces
    # Simplified: capture admin-prefix group block (line 909–1037 in original)
    admin_block_match = re.search(
        r"Route::group\(\s*\[\s*['\"]prefix['\"]\s*=>\s*['\"]admin['\"].*?function\s*\(\s*\)\s*\{(.+?)\n\}\);",
        src_clean,
        re.DOTALL,
    )
    admin_text = admin_block_match.group(1) if admin_block_match else ""
    api_key_match = re.search(
        r"Route::group\(\s*\[\s*['\"]middleware['\"]\s*=>\s*['\"]api_key['\"].*?function\s*\(\s*\)\s*\{(.+?)\n\}\);",
        src_clean,
        re.DOTALL,
    )
    api_key_text = api_key_match.group(1) if api_key_match else ""

    def harvest(text: str, prefix: str = "", group: str = "public"):
        for m in LARAVEL_VERB_RE.finditer(text):
            verb = m.group(1).upper()
            path_str = m.group(2).lstrip("/")
            ctrl = m.group(3) or ""
            action = m.group(4) or m.group(5) or "closure"
            full = f"/{prefix}/{path_str}".replace("//", "/") if prefix else f"/{path_str}"
            routes.append({
                "method": verb,
                "path": full,
                "controller": ctrl.split("\\")[-1],
                "action": action,
                "group": group,
            })
        for m in LARAVEL_RESOURCE_RE.finditer(text):
            base = m.group(1).lstrip("/")
            ctrl = m.group(2).split("\\")[-1]
            full_base = f"/{prefix}/{base}".replace("//", "/") if prefix else f"/{base}"
            for verb, tmpl, action in RESOURCE_TEMPLATE:
                routes.append({
                    "method": verb,
                    "path": tmpl.format(base=full_base),
                    "controller": ctrl,
                    "action": action,
                    "group": f"{group}:resource",
                })

    # Harvest admin-prefix block first (so we can subtract from rest)
    harvest(admin_text, prefix="admin", group="admin")
    harvest(api_key_text, prefix="", group="api_key")

    # Strip blocks already harvested before harvesting rest
    rest_text = src_clean
    if admin_block_match:
        rest_text = rest_text.replace(admin_block_match.group(0), "")
    if api_key_match:
        rest_text = rest_text.replace(api_key_match.group(0), "")
    harvest(rest_text, prefix="", group="auth_or_public")

    return routes


# ---------- NEW (FastAPI) ----------

FASTAPI_DECORATOR_RE = re.compile(
    r"@router\.(get|post|put|patch|delete|options)\(\s*['\"]([^'\"]+)['\"]",
)
ROUTER_PREFIX_RE = re.compile(
    r"router\s*=\s*APIRouter\(\s*[^)]*prefix\s*=\s*['\"]([^'\"]+)['\"]",
    re.DOTALL,
)
INCLUDE_ROUTER_RE = re.compile(
    r"app\.include_router\(\s*([a-zA-Z_0-9.]+)\.router\s*,?\s*([^)]*)\)",
    re.DOTALL,
)
INCLUDE_PREFIX_RE = re.compile(r"prefix\s*=\s*['\"]([^'\"]+)['\"]")


def parse_fastapi(backend_root: Path) -> list[dict]:
    main_py = (backend_root / "main.py").read_text(encoding="utf-8", errors="ignore")

    # 1. parse main.py: module-name -> prefix (e.g., "custom_fields" -> "/api/v1/custom_fields")
    INCLUDE_RE = re.compile(
        r"app\.include_router\(\s*(?:[a-zA-Z_0-9]+\.)?([a-zA-Z_0-9]+)\.router"
        r"[^)]*?prefix\s*=\s*['\"]([^'\"]+)['\"]",
        re.DOTALL,
    )
    module_prefix: dict[str, str] = {}
    for m in INCLUDE_RE.finditer(main_py):
        module_prefix[m.group(1)] = m.group(2)

    routes: list[dict] = []
    api_dir = backend_root / "api" / "v1"
    for f in sorted(api_dir.glob("*.py")):
        if f.name == "__init__.py":
            continue
        text = f.read_text(encoding="utf-8", errors="ignore")
        # Prefer prefix from main.py mount; fall back to in-file APIRouter prefix.
        if f.stem in module_prefix:
            prefix = module_prefix[f.stem]
        else:
            prefix_m = ROUTER_PREFIX_RE.search(text)
            prefix = prefix_m.group(1) if prefix_m else f"/api/v1/{f.stem}"
        for m in FASTAPI_DECORATOR_RE.finditer(text):
            verb = m.group(1).upper()
            path_str = m.group(2)
            full = f"{prefix}{path_str}".replace("//", "/")
            routes.append({
                "method": verb,
                "path": full.rstrip("/") or "/",
                "module": f.stem,
                "group": "v1",
            })

    return routes


# ---------- DIFF ----------

def normalise_old(p: str) -> str:
    """Strip rest_ prefix, normalise {param} placeholders for comparison."""
    p = p.lower()
    p = re.sub(r"\{[^}]+\}", "{id}", p)
    return p


def normalise_new(p: str) -> str:
    p = p.lower().replace("/api/v1", "")
    p = re.sub(r"\{[^}]+\}", "{id}", p)
    return p


def main():
    print("Parsing OLD Laravel routes ...")
    old = parse_laravel(OLD_API)
    print(f"  -> {len(old)} routes")

    print("Parsing NEW FastAPI routes ...")
    new = parse_fastapi(NEW_BACKEND)
    print(f"  -> {len(new)} routes")

    # Write CSVs
    with (OUT_DIR / "old_routes.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["method", "path", "controller", "action", "group"])
        w.writeheader()
        for r in old:
            w.writerow(r)
    with (OUT_DIR / "new_routes.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["method", "path", "module", "group"])
        w.writeheader()
        for r in new:
            w.writerow(r)

    # Build diff
    new_set = {(r["method"], normalise_new(r["path"])) for r in new}
    old_norm = [(r, (r["method"], normalise_old(r["path"]))) for r in old]

    missing: list[dict] = []
    matched: list[tuple[dict, str]] = []

    # Token-based fuzzy match: derive resource tokens
    def tokens(path: str) -> set[str]:
        return {t for t in re.split(r"[/_\-]", path) if t and t != "{id}" and t != "rest"}

    new_token_index = []
    for r in new:
        new_token_index.append((r, tokens(normalise_new(r["path"])), r["method"]))

    for r, key in old_norm:
        if key in new_set:
            matched.append((r, "exact"))
            continue
        # fuzzy: same method, ≥ 50% token overlap, share at least one resource word
        otoks = tokens(normalise_old(r["path"]))
        best = None
        best_score = 0.0
        for nr, ntoks, nverb in new_token_index:
            if nverb != r["method"]:
                continue
            if not (otoks & ntoks):
                continue
            score = len(otoks & ntoks) / max(len(otoks | ntoks), 1)
            if score > best_score:
                best_score = score
                best = nr
        if best and best_score >= 0.5:
            matched.append((r, f"fuzzy:{best_score:.2f}->{best['method']} {best['path']}"))
        else:
            missing.append(r)

    # Group missing by controller
    by_ctrl: dict[str, list[dict]] = {}
    for r in missing:
        by_ctrl.setdefault(r["controller"] or "(closure)", []).append(r)

    md_lines = [
        "# Old → New API parity diff (auto-generated)",
        "",
        f"- OLD endpoints parsed: **{len(old)}**",
        f"- NEW endpoints parsed: **{len(new)}**",
        f"- Matched (exact or fuzzy ≥0.5): **{len(matched)}**",
        f"- Missing in new: **{len(missing)}**",
        "",
        "## Missing endpoints, grouped by old controller",
        "",
    ]
    for ctrl in sorted(by_ctrl.keys()):
        md_lines.append(f"### {ctrl} ({len(by_ctrl[ctrl])})")
        md_lines.append("")
        md_lines.append("| Method | Path | Action | Group |")
        md_lines.append("|---|---|---|---|")
        for r in by_ctrl[ctrl]:
            md_lines.append(f"| {r['method']} | `{r['path']}` | {r['action']} | {r['group']} |")
        md_lines.append("")

    md_lines += [
        "## Fuzzy matches (likely covered, verify response shape)",
        "",
        "| Old method | Old path | Match |",
        "|---|---|---|",
    ]
    for r, info in matched:
        if info.startswith("fuzzy"):
            md_lines.append(f"| {r['method']} | `{r['path']}` | {info} |")

    (OUT_DIR / "diff.md").write_text("\n".join(md_lines), encoding="utf-8")
    print(f"\nWrote: {OUT_DIR}/old_routes.csv, new_routes.csv, diff.md")
    print(f"Missing routes: {len(missing)}")


if __name__ == "__main__":
    main()
