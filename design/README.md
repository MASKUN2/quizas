# design/  ·  v[`1.1.0`](./VERSION)

The design surface for quizas — the durable, human-readable expression of what
the product is and how it behaves, kept diffable and reviewable independently of
the implementation. Where a fact is also encoded in code (the Prisma schema, the
NestJS controllers, the Next.js pages), the artifacts here are **derived from**
that code and cite it.

## Layout & dependency

Artifacts build on each other in one direction — edit them in this order:

```
glossary  <-  spec  <-  domain  <-  api & wireframe
```

| Artifact | What it is |
|---|---|
| [`glossary.csv`](./glossary.csv) | **Glossary** — the canonical, machine-readable list of domain terms (`term,korean,category,definition`). The `Domain` rows are the aggregate roots. |
| [`spec/`](./spec/) | **Product specification** — purpose, actors, functional requirements, policies, non-functional requirements, and the visual-design system. [`spec/README.md`](./spec/README.md) is the entry point. **This is the source of truth for intent.** |
| [`domain/`](./domain/) | **Domain model** — Mermaid ER diagrams: a full overview plus one file per aggregate root (Post, Category, Tag, Series, Comment). Derived from `apps/api/prisma/schema.prisma`. |
| [`api/`](./api/) | **API contract** — [`api/openapi.yaml`](./api/openapi.yaml), an OpenAPI 3.1 description of all HTTP endpoints, auth, request/response schemas, and error codes, plus [`api/.spectral.yaml`](./api/.spectral.yaml) to lint it. Derived from `apps/api`. |
| [`wireframe/`](./wireframe/) | **UI wireframes** — one bare-wireframe HTML file per user-facing screen (12 total) plus an [`index.html`](./wireframe/index.html) gallery, all sharing [`wireframe.css`](./wireframe/wireframe.css). Deliberately minimal (one hairline border, system font, one foreground/background pair, auto light/dark) — structure and copy only, with an `<aside class="note">` explanation on each screen. Derived from the Next.js pages. |
| [`validate.py`](./validate.py) | **Design consistency linter** — checks the artifacts against each other and the Prisma schema. Stdlib only. |
| [`conformance.py`](./conformance.py) | **Source conformance checker** — checks the implementation (`apps/`) actually follows the design. Stdlib only. |
| [`package.json`](./package.json) | **Tooling entry points** — `validate` / `conformance` / `lint` / `check` scripts; the sole dependency is Spectral (for `lint`). |

## Working on quizas — design first

**When adding or changing an quizas feature, update this design surface *before*
touching `apps/`.** The design is the source of truth for intent; the code is
derived from it. Edit the artifacts in dependency order, top-down — only the
layers a change actually touches:

1. **glossary.csv** — new/changed vocabulary (a term, a state, an actor).
2. **spec/** — the *what* and *why*: functional requirement, policy, UI pattern.
3. **domain/** — new entity/field/relation/enum (only if the model changes).
4. **api/openapi.yaml** — the endpoint/schema for the change.
5. **wireframe/** — the affected screen mockup(s) + `index.html`.

Then run `python3 validate.py` until green, implement in `apps/`, and run
`python3 conformance.py` to confirm the code matches. A change that skips the
design step is incomplete.

## Validation

Two scripts answer two different questions (add `-q` to either for a
failures-only report; both exit non-zero on any problem):

```bash
python3 validate.py        # "is the design internally consistent?"   (reads design/ only)
python3 conformance.py     # "does the code follow the design?"        (reads apps/ vs design/)

# via package.json (Spectral must be installed first: npm install)
npm run validate           # = python3 validate.py
npm run lint               # = spectral lint api/openapi.yaml
npm run check              # validate + lint
```

**`validate.py`** verifies, layer by layer: the glossary parses and its domain
terms match the aggregate roots; the `domain/` ER diagrams and enums match the
Prisma schema; the OpenAPI spec is 3.1, exposes every resource/aggregate, has
unique operationIds and no dangling `$ref`s, with enums that match the schema;
and the wireframes all exist, share `wireframe.css`, carry an `<aside class="note">`,
link the index, and pull no external assets. A failure means the **design** is
malformed.

**`conformance.py`** checks structural drift: the NestJS controllers and
`api/openapi.yaml` expose the same routes (both directions); each route's
admin-guard requirement (`@UseGuards(AdminGuard)`) matches its spec `security`;
and every documented UI screen maps to a real Next.js `page.tsx`. A failure means
the **code** drifted from the design (or the design needs updating). It reuses
`validate.py`'s parsers, so there's no duplication.

**`lint`** (Spectral) is orthogonal: it checks the OpenAPI document's own
correctness and house style, not its agreement with the other artifacts.

## Conventions

- **Spec is intent, not implementation.** No framework names or file paths inside
  `spec/` prose — those belong in the repo [`README.md`](../README.md).
- **Derived artifacts cite their source.** The domain model and API contract track
  `apps/api`; the wireframes track `apps/web`. When the code changes, update these.
- **Diagrams are Mermaid** (`erDiagram`) so they render on GitHub and in most
  Markdown viewers.
- **Wireframes are self-contained.** No external assets, fonts, or network
  requests — they share the relative `wireframe.css` and nothing else, so any
  file opens directly in a browser.
