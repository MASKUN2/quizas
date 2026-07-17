# Domain Model

The quizas domain, as an entity-relationship model. This is derived from the
persistence schema (`apps/api/prisma/schema.prisma`) and expresses the same
intent as [`../spec/README.md` §3 Domain Concepts](../spec/README.md#3-domain-concepts)
and the integrity rules in [`../spec/policies.md` §5.3](../spec/policies.md#53-relationships--integrity).

There are **five aggregate roots** — each with an independent lifecycle and its
own API resource — documented one per file:

- [`post.md`](./post.md) — **Post** (the central aggregate)
- [`category.md`](./category.md) — **Category**
- [`tag.md`](./tag.md) — **Tag**
- [`series.md`](./series.md) — **Series**
- [`comment.md`](./comment.md) — **Comment**

## Full ERD

```mermaid
erDiagram
    CATEGORY ||--o{ POST : "categorizes (exactly one per post)"
    SERIES   |o--o{ POST : "groups (optional, ordered)"
    POST     }o--o{ TAG : "tagged (many-to-many)"
    POST     ||--o{ COMMENT : "receives"
    COMMENT  |o--o{ COMMENT : "replies to (threaded)"

    POST {
        string     id PK
        string     slug UK
        string     title
        string     excerpt "nullable"
        string     content "markdown"
        PostStatus status "DRAFT | PUBLISHED, default DRAFT"
        datetime   publishedAt "nullable, set on first publish"
        int        readingTime "nullable, minutes"
        int        viewCount "default 0"
        string     categoryId FK
        string     seriesId FK "nullable"
        int        seriesOrder "nullable"
        datetime   createdAt
        datetime   updatedAt
    }
    CATEGORY {
        string   id PK
        string   slug UK
        string   name
        string   description "nullable"
        datetime createdAt
        datetime updatedAt
    }
    TAG {
        string   id PK
        string   slug UK
        string   name
        datetime createdAt
    }
    SERIES {
        string   id PK
        string   slug UK
        string   title
        string   description "nullable"
        datetime createdAt
        datetime updatedAt
    }
    COMMENT {
        string        id PK
        string        content
        string        authorName
        string        authorEmail "nullable, never public"
        CommentStatus status "PENDING | APPROVED | SPAM, default PENDING"
        string        postId FK
        string        parentId FK "nullable, self"
        datetime      createdAt
        datetime      updatedAt
    }
```

## Relationships & cardinality

| From | To | Cardinality | Notes |
|---|---|---|---|
| Category | Post | 1 — 0..* | Every post has **exactly one** category (`categoryId` required). No cascade — a category with posts cannot be deleted until reassigned. |
| Series | Post | 0..1 — 0..* | A post belongs to **at most one** series; membership is optional and detachable. `seriesOrder` is its position. Deleting a series nulls its posts' `seriesId`. |
| Post | Tag | 0..* — 0..* | Many-to-many via implicit join (`PostTags`). |
| Post | Comment | 1 — 0..* | `onDelete: Cascade` — deleting a post deletes its comments. |
| Comment | Comment | 0..1 — 0..* | Self-relation (`CommentReplies`). A reply has one parent; `onDelete: Cascade` — deleting a parent deletes its replies. A reply must be on the **same post** as its parent. |

## Enums

- **`PostStatus`**: `DRAFT`, `PUBLISHED` (default `DRAFT`).
- **`CommentStatus`**: `PENDING`, `APPROVED`, `SPAM` (default `PENDING`).

## Legend

- **PK** — primary key (`cuid` string). **UK** — unique key. **FK** — foreign key.
- Crow's-foot: `||` exactly one · `|o` zero-or-one · `o{` zero-or-many.
- "nullable" marks optional (`?`) attributes; all `createdAt`/`updatedAt` are
  timestamps (`updatedAt` auto-maintained; **Tag has no `updatedAt`**).
