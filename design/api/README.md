# api/

The HTTP **API contract**: [`openapi.yaml`](./openapi.yaml), an **OpenAPI 3.1**
description of the quizas backend surface (paths, schemas, auth, errors).
Derived from `apps/api` (NestJS controllers, DTOs, services) — it describes the
contract only, so keep it in sync with the real API.

Rule: one component schema per aggregate root (named like the
[`../domain/`](../domain/) file — `Post`, `Category`, `Tag`, `Series`,
`Comment`), plus request/projection variants (`CreatePost`, `PostDetail`,
`PublicComment`, …). Write/moderation operations carry `bearerAuth`
(the internal shared admin token); public reads carry `- {}`.

## Linting

[`.spectral.yaml`](./.spectral.yaml) lints this document on its own for OpenAPI
correctness and house style. From the [`../`](../) (design) dir:

```bash
npm run lint        # spectral lint api/openapi.yaml
```

`../validate.py` handles the *cross-artifact* checks (every aggregate exposed,
enums match the Prisma schema, no dangling `$ref`s, operationIds unique).
