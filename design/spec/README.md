# quizas — Product Specification

The **what** and the **why** of quizas: its purpose, the features it must
provide, and the rules that govern them. This document is intentionally free of
implementation detail — no frameworks, file paths, or code. For *how* it is
built, see [`README.md`](../../README.md); for *how* it is deployed, see
[`DEPLOYMENT.md`](../../DEPLOYMENT.md).

When behaviour and this document disagree, treat it as a bug in one of them and
reconcile — this is the source of truth for intent.

## Contents

The specification is split across this directory:

| File | Covers |
|---|---|
| **this file** | §1 Purpose & Vision, §2 Actors, §3 Domain Concepts, §8 Out of Scope, §9 Glossary |
| [`functional.md`](./functional.md) | §4 Functional Requirements |
| [`policies.md`](./policies.md) | §5 Policies & Business Rules, §6 Non-Functional Requirements |
| [`ui-design.md`](./ui-design.md) | §7 UI & Visual Design |

Related design artifacts live alongside this directory: the machine-readable
[`../glossary.csv`](../glossary.csv), the [`../domain/`](../domain/)
ER diagrams, the [`../api/openapi.yaml`](../api/openapi.yaml) API contract, and the
[`../wireframe/`](../wireframe/) HTML screen mockups.

---

## 1. Purpose & Vision

quizas is the personal blog of **Inho Jeong** — a single author writing as
both a developer and a person. The name plays on *inho* + *anthology*: a curated
selection of writing, code, and thought.

It is **not** a multi-tenant publishing platform. It is a focused, single-author
site optimised for: writing comfortably, publishing deliberately, organising
content meaningfully, and letting readers respond.

### Goals
- A frictionless private writing-and-publishing loop for one author.
- A clean, fast, readable public site.
- Lightweight reader engagement (comments) that stays under the author's control.
- Self-hostable on modest hardware (a home-server VM).

### Non-Goals
- Multiple authors, author accounts, or role hierarchies beyond *author* vs *reader*.
- A WYSIWYG editor (content is authored in Markdown).
- Monetisation, ads, paywalls, or newsletters.
- Social-network features (follows, likes, reader profiles).
- Real-time collaboration.

---

## 2. Actors

| Actor | Description | How they're identified |
|---|---|---|
| **Author** | Inho. The sole privileged user. Creates, edits, deletes, and publishes content; moderates comments. | Authenticates via the homelab SSO (Authentik OIDC). There is exactly one. |
| **Reader** | Anyone on the public internet. Reads published content and submits comments. | Anonymous. No accounts, no login. |

There is no registration, no reader account, and no second author. Any future
multi-author need is explicitly out of scope for this version.

---

## 3. Domain Concepts

- **Post** — the central unit of content. A Markdown article with a title, a
  URL slug, optional summary, and a publication state. The aggregate everything
  else hangs off of.
- **Category** — a broad, mutually-exclusive bucket (e.g. *기획 / 일상 / 에세이*).
  Every post belongs to **exactly one**.
- **Tag** — a cross-cutting topic label. A post may have **many**; a tag spans
  many posts.
- **Series** — an ordered collection of posts telling a longer story across
  multiple parts. A post belongs to **at most one** series and has a position
  within it. Optional.
- **Comment** — a reader's response attached to a published post. May reply to
  another comment (threaded). Always moderated.

The domain model is diagrammed in [`../domain/`](../domain/).

---

## 8. Out of Scope (this version)

- Reader accounts, authentication, or profiles.
- Multiple authors or granular roles.
- Full-text search, related-posts, recommendations.
- Email delivery / notifications / newsletters.
- Analytics beyond a simple view count.
- A **media library / gallery** for browsing, re-selecting, or managing uploaded
  images. Inline image *upload* is supported (see [§4.1](./functional.md#41-posts-author),
  [§5.7](./policies.md#57-images)), but images are fire-and-forget — inserted
  once, not curated in a browsable collection.
- **Cover images** for posts or series. Images live inline in the body only.
- Scheduled publishing.
- RSS/Atom feeds *(candidate for a future version)*.

---

## 9. Glossary

The canonical, machine-readable glossary lives in
[`../glossary.csv`](../glossary.csv). Core terms:

| Term | Meaning |
|---|---|
| **Draft** | A post that has been saved but not published; private to the author. |
| **Published** | A post visible to readers, with a publication timestamp. |
| **Slug** | The URL-safe identifier for a post, category, tag, or series. |
| **Pending** | A submitted comment awaiting the author's moderation. |
| **Series order** | A post's integer position within its series. |
| **Author** | The single privileged user (Inho). |
| **Reader** | Any anonymous public visitor. |
