# quizas

A general blog by **Inho Jeong** — written as both a developer and a person.
The name is a play on *inho* + *anthology*: a personal selection of writing, code, and thought.

## Documentation

- **[design/](./design/)** — the design surface: product spec, glossary, domain model, API contract, and UI wireframes. **Edit this first when changing a feature** — see [AGENTS.md](./AGENTS.md).
  - **[design/spec/](./design/spec/)** — what quizas *is*: purpose, requirements, and policies (no implementation detail).
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — how to deploy it to a home-server VM.
- This README — how it's built and how to run it locally.

## Stack

- **[pnpm](https://pnpm.io) workspaces** monorepo (`apps/*`, `packages/*`) with **[Turborepo](https://turborepo.com)** as the task runner.
- **`apps/web`** → `@quizas/web` — [Next.js 16](https://nextjs.org) (App Router, TypeScript, Tailwind v4, `src/` dir, `@/*` import alias).
- **`apps/api`** → `@quizas/api` — [NestJS 11](https://nestjs.com) (TypeScript, strict mode).
- Toolchain pinned by **[mise](https://mise.jdx.dev)** (`mise.toml`): Node 22, pnpm 11.8.0. Run `mise install` once to match versions.

## Layout

```
quizas/
├── apps/
│   ├── web/        # Next.js frontend  (@quizas/web)
│   └── api/        # NestJS backend    (@quizas/api)
├── packages/            # shared packages (tbd)
├── design/              # design surface: spec, glossary, domain model, openapi, UI mockups (+ validate.py)
├── turbo.json           # task pipeline: build / dev / lint / test / type-check
├── tsconfig.base.json
├── pnpm-workspace.yaml  # workspace globs + pnpm supply-chain settings
├── mise.toml            # pinned toolchain (node, pnpm)
└── package.json         # root scripts proxy to turbo
```

## Local development

```bash
colima start && docker compose up -d   # start Postgres (see Commands below)
pnpm install                              # install all workspace deps
pnpm --filter @quizas/api db:seed        # seed categories/tags/sample post
pnpm dev                                   # run web + api together
```

- **web** (Next.js) → http://localhost:3000
- **api** (NestJS) → http://localhost:4000 (web reads it via `API_URL`)

## Authentication & deployment

- **Admin auth = homelab SSO (Authentik OIDC).** The web app gates `/admin` on an
  Authentik OIDC session (Auth.js v5); `web→api` calls use an internal shared
  `ADMIN_TOKEN` (the API is cluster-internal only). The old password login
  (`ADMIN_PASSWORD`) is removed. Auth wiring: `apps/web/src/auth.ts`,
  `apps/web/src/lib/auth.ts`, `apps/web/src/app/admin/actions.ts`.
- **Production runs on the homelab k3s cluster** (`quizas.jwih.org`) via **GitOps** —
  push to `main` is the deploy. `.github/workflows/deploy.yml` builds `web`/`api` (amd64)
  and pushes to `ghcr.io/maskun2/quizas-*:<sha>`, then bumps the tag in `deploy/`
  (kustomize). Argo CD in the cluster watches `deploy/` and auto-syncs (rollback = revert
  the tag commit). Cluster-side setup: **`homelab/OPERATIONS.md` §3a** + `homelab/k8s/system/argocd/`.
  [DEPLOYMENT.md](./DEPLOYMENT.md) keeps the original single-VM Compose guide as an alternative.
- Container images: `apps/web/Dockerfile`, `apps/api/Dockerfile` (monorepo, build context = repo root).
- Local dev: public pages need only the API. To exercise `/admin` locally, set the web
  `AUTH_*` env (Authentik client id/secret/issuer + `AUTH_SECRET`) against a reachable Authentik.

## Images (본문 이미지)

Inline post images live in **MinIO**, served under the site's own domain — the API is not
involved (images aren't catalogued; [design/spec §5.7](./design/spec/policies.md#57-images)). All handled by the **web** app:

- **Upload** — `POST /admin/api/upload` (`apps/web/src/app/admin/api/upload/route.ts`): author-only
  (Authentik session), magic-byte type check (PNG/JPEG/WebP/GIF, **SVG rejected**), 10MB cap,
  content-addressed key `<sha256>.<ext>` (dedup + immutable), `PUT` to MinIO. Returns `/images/<key>`.
- **Serve** — `GET /images/[...key]` (`apps/web/src/app/images/[...key]/route.ts`): **streams** the
  object from MinIO (no redirect → MinIO stays hidden), `Cache-Control: immutable`. Keys are content
  hashes, so Cloudflare's edge caches indefinitely; origin is hit rarely. Bucket stays **private**.
- **Editor** — `BodyEditor` (`apps/web/src/components/body-editor.tsx`): paste / drag-drop / file-picker
  → upload → auto-insert `![](…)` at the cursor (placeholder while in flight). `[편집|미리보기]` toggle
  renders via the shared `<Markdown>` (same renderer as the public post).
- **S3 client** — `apps/web/src/lib/storage.ts` (the `minio` package). Config via `MINIO_ENDPOINT`,
  `MINIO_BUCKET`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` (scoped svcacct; see `homelab/minio.md`).

## Commands

Run from the repo root — Turbo fans each task out to every workspace that defines it.

```bash
pnpm install        # install all workspace deps
pnpm dev            # run web (:3000) + api (:4000) together
pnpm build          # build all apps
pnpm lint           # lint all apps
pnpm type-check     # type-check all apps
pnpm test           # run tests
```

Target a single app with a Turbo filter:

```bash
pnpm exec turbo run dev --filter=@quizas/web
pnpm exec turbo run build --filter=@quizas/api
```

## Supply-chain hardening (pnpm)

pnpm is used partly for its security defaults. Configured in `pnpm-workspace.yaml`:

- **Install scripts blocked by default.** Only packages listed under `allowBuilds: { <pkg>: true }`
  may run `postinstall`/build scripts (currently `sharp`, `unrs-resolver` — both legitimate
  native-binary builds). When a new dependency's script is blocked, pnpm reports it; vet it,
  then `pnpm approve-builds <pkg>` to allow.
- **Strict, non-flat `node_modules`.** Code can only import packages it explicitly declares —
  no "phantom dependencies" (transitive deps are not importable). Like Gradle `implementation` scoping.
- **Content-addressed store** with integrity hashes; shared across projects (like `~/.m2`).
- **`minimumReleaseAge`** (currently disabled, see the comment in `pnpm-workspace.yaml`):
  refuses just-published versions to dodge "compromised hours ago" attacks. Off for now because
  the freshly-scaffolded toolchain pins versions younger than a useful window.

## Notes

- **Next.js 16 has breaking changes** vs earlier versions. See `apps/web/AGENTS.md` — read the relevant guide under `apps/web/node_modules/next/dist/docs/` before writing Next.js code.
- **TLS / cert troubleshooting** (this machine): if Node HTTPS fails with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`
  (pnpm installs, fetch, etc.), Homebrew's `openssl@3` cert link is missing. Fix it — don't disable `strict-ssl`:
  ```bash
  brew postinstall openssl@3   # recreates etc/openssl@3/cert.pem -> ../ca-certificates/cert.pem
  ```
