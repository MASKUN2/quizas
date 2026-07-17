# Working on quizas

## Design first

Before adding or changing a feature, update the **[design surface](./design/)**
*first*, then implement in `apps/`. The design is the source of truth for intent;
the code is derived from it — not the other way around.

Edit the artifacts in dependency order (top-down, only the layers a change
touches):

```
glossary  <-  spec  <-  domain  <-  api & wireframe
```

1. `design/glossary.csv` — new/changed vocabulary.
2. `design/spec/` — the *what* and *why* (functional req, policy, UI pattern).
3. `design/domain/` — new entity/field/relation/enum (only if the model changes).
4. `design/api/openapi.yaml` — the endpoint/schema.
5. `design/wireframe/` — the affected screen mockup(s) + `index.html`.

Then: `python3 design/validate.py` until green → implement in `apps/` →
`python3 design/conformance.py` to confirm the code matches. See
[`design/README.md`](./design/README.md) for the full workflow.

Sub-project agent notes: [`apps/web/AGENTS.md`](./apps/web/AGENTS.md).
