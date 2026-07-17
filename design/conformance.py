#!/usr/bin/env python3
"""
Check that the IMPLEMENTATION follows the design.

This is the companion to validate.py, and deliberately separate:

    validate.py    — "is the design internally consistent?"  (reads design/ only)
    conformance.py — "does the code follow the design?"       (reads apps/ vs design/)

They answer different questions, are owned by different people, and fail for
different reasons. A red validate.py means the design is malformed; a red
conformance.py means the code drifted from the design (or the design needs
updating). Run validate.py on design changes, conformance.py on code changes.

Shared parsing helpers are imported from validate.py — no duplication.

Structural checks only (high signal, low false-positive):
  1. API routes   — NestJS controllers  <->  openapi.yaml  (bidirectional drift)
  2. Auth guards  — @UseGuards(AdminGuard)  <->  security: bearerAuth  (per op)
  3. UI routes    — each documented screen (mockup)  ->  a real Next.js page.tsx

Stdlib only. Run:
    python3 design/conformance.py          # full report
    python3 design/conformance.py -q        # failures + summary only

Exit code: 0 = conforms (warnings allowed), 1 = at least one drift.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

# Make `import validate` work regardless of cwd.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate import read, Report, DESIGN, ROOT  # noqa: E402

API_SRC = ROOT / "apps" / "api" / "src"
WEB_APP = ROOT / "apps" / "web" / "src" / "app"
OPENAPI = DESIGN / "api" / "openapi.yaml"
UI_DIR = DESIGN / "wireframe"

HTTP_METHODS = ("Get", "Post", "Patch", "Delete", "Put")


# --------------------------------------------------------------------------- #
# Path normalisation — a path param's NAME is irrelevant to routing, so
# `/posts/:idOrSlug` (code) and `/posts/{id}` (openapi) are the same route.
# --------------------------------------------------------------------------- #
def norm(path: str) -> str:
    parts = []
    for p in path.split("/"):
        if not p:
            continue
        if p.startswith(":") or (p.startswith("{") and p.endswith("}")):
            parts.append("{}")
        else:
            parts.append(p)
    return "/" + "/".join(parts) if parts else "/"


# --------------------------------------------------------------------------- #
# Parse NestJS controllers → {(METHOD, normpath): requires_admin}
# --------------------------------------------------------------------------- #
def api_routes_from_code():
    routes = {}
    for f in sorted(API_SRC.rglob("*.controller.ts")):
        text = read(f) or ""
        base_m = re.search(r"@Controller\(\s*(?:'([^']*)')?\s*\)", text)
        base = base_m.group(1) if (base_m and base_m.group(1)) else ""
        # controller-level guard: @UseGuards(...AdminGuard...) between @Controller and the class
        region = re.search(r"@Controller\([^)]*\)(.*?)export class", text, re.S)
        class_guard = bool(region and "AdminGuard" in region.group(1))

        # Group the decorator lines that precede each handler method.
        pending: list[str] = []
        for raw in text.splitlines():
            s = raw.strip()
            if s.startswith("@"):
                pending.append(s)
            elif re.match(r"(async\s+)?[A-Za-z_]\w*\s*\(", s) and pending:
                block = " ".join(pending)
                pending = []
                mm = re.search(
                    r"@(" + "|".join(HTTP_METHODS) + r")\(\s*(?:'([^']*)')?\s*\)",
                    block,
                )
                if not mm:
                    continue  # e.g. constructor()
                method = mm.group(1).upper()
                sub = mm.group(2) or ""
                full = norm("/".join(filter(None, [base, sub])))
                requires = class_guard or "AdminGuard" in block
                routes[(method, full)] = requires
            elif s and not s.startswith(("//", "*", "/*")):
                pending = []
    return routes


# --------------------------------------------------------------------------- #
# Parse openapi.yaml operations → {(METHOD, normpath): requires_auth}
# requires_auth = operation has `bearerAuth` AND no public `- {}` alternative.
# --------------------------------------------------------------------------- #
def api_ops_from_spec(text: str):
    # Scan only the paths section (components also mentions bearerAuth).
    start = text.find("\npaths:")
    body = text[start:] if start != -1 else text
    body = body.split("\ncomponents:")[0]

    ops = {}
    cur_path = None
    cur = None

    def flush():
        if cur and cur_path is not None:
            ops[(cur["method"], norm(cur_path))] = cur["bearer"] and not cur["public"]

    for line in body.splitlines():
        mp = re.match(r"^  (/[^\s:]*):", line)
        if mp:
            flush()
            cur = None
            cur_path = mp.group(1)
            continue
        mm = re.match(r"^    (get|post|patch|delete|put):", line)
        if mm and cur_path is not None:
            flush()
            cur = {"method": mm.group(1).upper(), "bearer": False, "public": False}
            continue
        if cur is not None:
            if "bearerAuth" in line:
                cur["bearer"] = True
            if re.search(r"-\s*\{\}", line):
                cur["public"] = True
    flush()
    return ops


# --------------------------------------------------------------------------- #
# Next.js App Router routes from page.tsx files (route groups stripped).
# --------------------------------------------------------------------------- #
def web_routes():
    routes = set()
    for page in WEB_APP.rglob("page.tsx"):
        segs = []
        for s in page.relative_to(WEB_APP).parent.parts:
            if s.startswith("(") and s.endswith(")"):
                continue  # route group, transparent in the URL
            if s.startswith("[") and s.endswith("]"):
                segs.append("{" + s[1:-1] + "}")
            else:
                segs.append(s)
        routes.add("/" + "/".join(segs) if segs else "/")
    return routes


def documented_screen_routes():
    """Route each mockup documents, from the <code>/…</code> in its note <h3>."""
    out = {}
    for html in sorted(UI_DIR.glob("[0-9][0-9]-*.html")):
        text = read(html) or ""
        m = re.search(
            r'<aside class="note">.*?<h3>.*?<code>(/[^<]*)</code>', text, re.S
        )
        if m:
            out[html.name] = m.group(1)
    return out


# --------------------------------------------------------------------------- #
def main():
    r = Report()
    print("Checking implementation conforms to design/ "
          "(api↔openapi · guards · ui↔routes)")

    spec = read(OPENAPI)
    if spec is None:
        print(f"\n\033[31mFATAL\033[0m: openapi.yaml not found at {OPENAPI}")
        return 1

    code = api_routes_from_code()
    doc = api_ops_from_spec(spec)

    # --- 1. API route conformance (bidirectional) ---------------------------
    r.layer("1. API routes  (NestJS controllers ↔ openapi.yaml)")
    code_set, doc_set = set(code), set(doc)
    missing_in_spec = sorted(code_set - doc_set)
    missing_in_code = sorted(doc_set - code_set)
    r.check(
        not missing_in_spec,
        f"every code route ({len(code_set)}) is documented in openapi.yaml",
        "routes in code but NOT in openapi.yaml: "
        + ", ".join(f"{m} {p}" for m, p in missing_in_spec),
    )
    r.check(
        not missing_in_code,
        f"every openapi route ({len(doc_set)}) exists in code",
        "routes in openapi.yaml but NOT in code: "
        + ", ".join(f"{m} {p}" for m, p in missing_in_code),
    )

    # --- 2. Auth-guard conformance ------------------------------------------
    r.layer("2. Auth guards  (@UseGuards(AdminGuard) ↔ security: bearerAuth)")
    shared = sorted(code_set & doc_set)
    mismatches = [(m, p) for (m, p) in shared if code[(m, p)] != doc[(m, p)]]
    if mismatches:
        for m, p in mismatches:
            r.fail(
                f"{m} {p}: code {'requires admin' if code[(m, p)] else 'is public'}, "
                f"spec {'requires auth' if doc[(m, p)] else 'is public'} — mismatch"
            )
    else:
        r.ok(f"admin-guard requirement agrees on all {len(shared)} shared routes")

    # --- 3. UI screen ↔ route existence -------------------------------------
    r.layer("3. UI routes  (documented screens → real Next.js pages)")
    actual = web_routes()
    docs = documented_screen_routes()
    r.check(len(docs) == 12, f"{len(docs)} screens declare a route",
            f"expected 12 screens with routes, found {len(docs)}", warn=True)
    for name, route in sorted(docs.items()):
        ok = route in actual
        if not ok:
            # tolerate param-name differences (e.g. {slug} vs {id})
            ok = norm(route) in {norm(a) for a in actual}
        r.check(ok, f"{name} → {route} has a page",
                f"{name} documents {route} but no matching page.tsx exists")

    print("\n" + "─" * 60)
    status = "\033[31mFAIL\033[0m" if r.errors else "\033[32mPASS\033[0m"
    print(f"{status}  {r.checks} checks · {r.errors} drift(s) · {r.warnings} warning(s)")
    return 1 if r.errors else 0


if __name__ == "__main__":
    sys.exit(main())
