#!/usr/bin/env python3
"""
Validate the quizas design artifacts for internal consistency.

The design/ folder is a layered description of the product. This script checks
each layer against the one it depends on, in order:

    glossary.csv  ->  domain/  ->  api/openapi.yaml + wireframe/

Ground truth for the domain is the Prisma schema (apps/api/prisma/schema.prisma);
every layer is cross-checked against it and against the layers before it.

Stdlib only (no pip installs). Run:

    python3 design/validate.py          # full report, exit 1 on any error
    python3 design/validate.py -q       # only show failures + summary

Exit code: 0 = no errors (warnings allowed), 1 = at least one error.
"""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

DESIGN = Path(__file__).resolve().parent
ROOT = DESIGN.parent
SCHEMA = ROOT / "apps" / "api" / "prisma" / "schema.prisma"

# The five aggregate roots (see design/domain/). Also the models we expect
# in the Prisma schema and the domain terms in the glossary's "Domain" category.
AGGREGATES = ["Post", "Category", "Tag", "Series", "Comment"]

SCREENS = [
    "01-home", "02-post-detail", "03-category-archive", "04-tag-archive",
    "05-series-index", "06-series-detail", "07-admin-login",
    "08-post-dashboard", "09-new-post", "10-edit-post",
    "11-comment-moderation", "12-series-management",
]

QUIET = "-q" in sys.argv or "--quiet" in sys.argv


# --------------------------------------------------------------------------- #
# Reporting
# --------------------------------------------------------------------------- #
class Report:
    def __init__(self):
        self.errors = 0
        self.warnings = 0
        self.checks = 0

    def layer(self, title):
        print(f"\n\033[1m{title}\033[0m")

    def ok(self, msg):
        self.checks += 1
        if not QUIET:
            print(f"  \033[32m✓\033[0m {msg}")

    def warn(self, msg):
        self.checks += 1
        self.warnings += 1
        print(f"  \033[33m⚠\033[0m {msg}")

    def fail(self, msg):
        self.checks += 1
        self.errors += 1
        print(f"  \033[31m✗\033[0m {msg}")

    def check(self, cond, ok_msg, fail_msg, warn=False):
        if cond:
            self.ok(ok_msg)
        elif warn:
            self.warn(fail_msg)
        else:
            self.fail(fail_msg)
        return bool(cond)


def read(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return None


# --------------------------------------------------------------------------- #
# Parsers (regex-based; no YAML dependency)
# --------------------------------------------------------------------------- #
def parse_prisma(text: str):
    """Return ({model: {fields}}, {enum: {values}})."""
    models = {}
    for m in re.finditer(r"model\s+(\w+)\s*\{(.*?)\}", text, re.S):
        fields = set()
        for line in m.group(2).splitlines():
            line = line.strip()
            if not line or line.startswith(("//", "@@")):
                continue
            fm = re.match(r"(\w+)\s", line)
            if fm:
                fields.add(fm.group(1))
        models[m.group(1)] = fields
    enums = {}
    for e in re.finditer(r"enum\s+(\w+)\s*\{(.*?)\}", text, re.S):
        vals = set()
        for v in e.group(2).splitlines():
            v = v.split("//")[0].strip()  # drop inline comments
            if v:
                vals.add(v)
        enums[e.group(1)] = vals
    return models, enums


def block_children(text: str, header: str):
    """Child keys directly under a 2-space-indented YAML header (indent 4)."""
    lines = text.splitlines()
    start = None
    for i, line in enumerate(lines):
        if re.match(rf"^  {header}:\s*$", line):
            start = i + 1
            break
    if start is None:
        return []
    keys = []
    for line in lines[start:]:
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip())
        if indent <= 2:
            break
        m = re.match(r"\s{4}(\w+):", line)
        if m and indent == 4:
            keys.append(m.group(1))
    return keys


def parse_openapi(text: str):
    return {
        "version": (re.search(r"openapi:\s*([\d.]+)", text) or [None, None])[1]
        if re.search(r"openapi:\s*([\d.]+)", text) else None,
        "paths": re.findall(r"(?m)^  (/[^\s:]*):", text),
        "operation_ids": re.findall(r"operationId:\s*(\w+)", text),
        "schemas": block_children(text, "schemas"),
        "responses": block_children(text, "responses"),
        "security_schemes": block_children(text, "securitySchemes"),
        "schema_refs": set(re.findall(r"#/components/schemas/(\w+)", text)),
        "response_refs": set(re.findall(r"#/components/responses/(\w+)", text)),
        "enum_sets": [
            frozenset(v.strip() for v in grp.split(",") if v.strip())
            for grp in re.findall(r"enum:\s*\[([^\]]*)\]", text)
        ],
    }


def mermaid_entities(text: str):
    """Uppercase entity names declared in a Mermaid erDiagram (e.g. POST { ... })."""
    return set(re.findall(r"(?m)^\s*([A-Z][A-Z_]+)\s*\{", text))


# --------------------------------------------------------------------------- #
# Layer checks
# --------------------------------------------------------------------------- #
def check_glossary(r: Report):
    r.layer("1. Glossary  (design/glossary.csv)")
    text = read(DESIGN / "glossary.csv")
    if text is None:
        r.fail("glossary.csv not found")
        return {"terms": set(), "domain": set()}

    rows = list(csv.DictReader(text.splitlines()))
    expected_cols = ["term", "korean", "category", "definition"]
    cols = list(rows[0].keys()) if rows else []
    r.check(cols == expected_cols,
            f"columns are {expected_cols}",
            f"columns must be {expected_cols}, got {cols}")

    terms, domain, dupes, empties = set(), set(), [], 0
    for row in rows:
        t = (row.get("term") or "").strip()
        if not t:
            empties += 1
            continue
        if t in terms:
            dupes.append(t)
        terms.add(t)
        if any(not (row.get(c) or "").strip() for c in ("korean", "category", "definition")):
            empties += 1
        if (row.get("category") or "").strip() == "Domain":
            domain.add(t)

    r.check(not dupes, f"{len(terms)} unique terms, no duplicates",
            f"duplicate terms: {dupes}")
    r.check(empties == 0, "every row has term/korean/category/definition filled",
            f"{empties} row(s) have empty cells")
    return {"terms": terms, "domain": domain}


def check_domain_model(r: Report, prisma, gloss):
    r.layer("2. Domain model  (design/domain/)  vs Prisma schema + glossary")
    models, enums = prisma

    # ground truth sanity: Prisma models == the five aggregates
    r.check(set(models) == set(AGGREGATES),
            f"Prisma models match the {len(AGGREGATES)} aggregate roots",
            f"Prisma models {sorted(models)} != aggregates {sorted(AGGREGATES)}",
            warn=True)

    # one file per aggregate root + overview
    for name in ["README"] + AGGREGATES:
        fn = f"{name.lower()}.md" if name != "README" else "README.md"
        r.check((DESIGN / "domain" / fn).exists(),
                f"domain/{fn} exists",
                f"domain/{fn} missing")

    readme = read(DESIGN / "domain" / "README.md") or ""
    ents = mermaid_entities(readme)
    for name in AGGREGATES:
        r.check(name.upper() in ents,
                f"ERD includes entity {name}",
                f"ERD (README) missing entity {name}")

    # enums declared in schema appear in the domain overview
    for ename, evals in enums.items():
        missing = [v for v in evals if v not in readme]
        r.check(not missing,
                f"enum {ename} values {sorted(evals)} documented",
                f"enum {ename} missing values in domain: {missing}")

    # every domain term in the glossary maps to an aggregate (and vice-versa)
    r.check(gloss["domain"] == set(AGGREGATES),
            "glossary 'Domain' terms == aggregate roots",
            f"glossary Domain terms {sorted(gloss['domain'])} != {sorted(AGGREGATES)}",
            warn=True)

    # each per-aggregate file actually diagrams its own entity
    for name in AGGREGATES:
        txt = read(DESIGN / "domain" / f"{name.lower()}.md") or ""
        r.check(name.upper() in mermaid_entities(txt),
                f"{name.lower()}.md diagrams {name}",
                f"{name.lower()}.md has no {name} entity block")


def check_api_spec(r: Report, prisma, gloss):
    r.layer("3. API spec  (design/api/openapi.yaml)  vs Prisma schema + domain model")
    text = read(DESIGN / "api" / "openapi.yaml")
    if text is None:
        r.fail("openapi.yaml not found")
        return
    api = parse_openapi(text)
    models, enums = prisma

    r.check(api["version"] and api["version"].startswith("3.1"),
            f"OpenAPI version is {api['version']}",
            f"expected OpenAPI 3.1, got {api['version']}")

    # each resource has a base path
    for res in ("posts", "series", "comments", "categories", "tags"):
        r.check(f"/{res}" in api["paths"],
                f"path /{res} present",
                f"path /{res} missing")

    # operationIds unique
    ids = api["operation_ids"]
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    r.check(not dupes, f"{len(ids)} operationIds, all unique",
            f"duplicate operationIds: {dupes}")

    # every aggregate is exposed as a response schema
    for name in AGGREGATES:
        r.check(name in api["schemas"],
                f"schema '{name}' defined",
                f"aggregate {name} has no component schema")

    # no dangling $refs
    undef_s = sorted(set(api["schema_refs"]) - set(api["schemas"]))
    r.check(not undef_s, "all schema $refs resolve",
            f"undefined schema $refs: {undef_s}")
    undef_r = sorted(api["response_refs"] - set(api["responses"]))
    r.check(not undef_r, "all response $refs resolve",
            f"undefined response $refs: {undef_r}")

    # enum values agree with the Prisma schema (source of truth)
    for ename, evals in enums.items():
        present = any(frozenset(evals) == s for s in api["enum_sets"])
        r.check(present,
                f"enum {ename} {sorted(evals)} matches an OpenAPI enum",
                f"enum {ename} {sorted(evals)} not found verbatim in openapi.yaml")


def check_ui(r: Report):
    r.layer("4. Wireframes  (design/wireframe/)  structure + linkage")
    ui = DESIGN / "wireframe"
    index = read(ui / "index.html")
    r.check(index is not None, "index.html exists", "index.html missing")
    r.check((ui / "wireframe.css").exists(),
            "shared wireframe.css exists",
            "wireframe/wireframe.css missing (screens share it)")

    for name in SCREENS:
        f = ui / f"{name}.html"
        txt = read(f)
        if txt is None:
            r.fail(f"{name}.html missing")
            continue
        problems = []
        if 'href="index.html"' not in txt:
            problems.append("no link to index.html")
        if "wireframe.css" not in txt:
            problems.append("does not link the shared wireframe.css")
        if "<footer" in txt:
            problems.append("still uses <footer> for the note")
        if '<aside class="note"' not in txt:
            problems.append("no <aside class=note> annotation")
        # self-contained: no external asset requests (the relative wireframe.css is fine)
        if re.search(r'(src|href)\s*=\s*"https?:', txt) or "@import" in txt:
            problems.append("references an external asset")
        r.check(not problems, f"{name}.html ok",
                f"{name}.html: {'; '.join(problems)}")

    if index is not None:
        r.check("wireframe.css" in index, "index.html links wireframe.css",
                "index.html does not link the shared wireframe.css")
        missing = [n for n in SCREENS if f'{n}.html' not in index]
        r.check(not missing, "index.html links to all 12 screens",
                f"index.html missing links: {missing}")


# --------------------------------------------------------------------------- #
def main():
    r = Report()
    print("Validating design/ artifacts "
          "(glossary → domain → api + wireframe)")

    schema_text = read(SCHEMA)
    if schema_text is None:
        print(f"\n\033[31mFATAL\033[0m: Prisma schema not found at {SCHEMA}")
        return 1
    prisma = parse_prisma(schema_text)

    gloss = check_glossary(r)
    check_domain_model(r, prisma, gloss)
    check_api_spec(r, prisma, gloss)
    check_ui(r)

    print("\n" + "─" * 60)
    status = "\033[31mFAIL\033[0m" if r.errors else "\033[32mPASS\033[0m"
    print(f"{status}  {r.checks} checks · {r.errors} error(s) · {r.warnings} warning(s)")
    return 1 if r.errors else 0


if __name__ == "__main__":
    sys.exit(main())
