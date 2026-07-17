# Post — aggregate root

The central unit of content and the aggregate everything else references. See the
[full ERD](./README.md) and [spec §3](../spec/README.md#3-domain-concepts).

```mermaid
erDiagram
    CATEGORY ||--o{ POST : "categorizes (required)"
    SERIES   |o--o{ POST : "groups (optional)"
    POST     }o--o{ TAG : "tagged"
    POST     ||--o{ COMMENT : "receives"

    POST {
        string     id PK
        string     slug UK
        string     title
        string     excerpt "nullable"
        string     content "markdown body"
        PostStatus status "DRAFT | PUBLISHED"
        datetime   publishedAt "nullable"
        int        readingTime "nullable, minutes"
        int        viewCount "default 0"
        string     categoryId FK
        string     seriesId FK "nullable"
        int        seriesOrder "nullable"
        datetime   createdAt
        datetime   updatedAt
    }
```

## Attributes

| Field | Type | Optional | Notes |
|---|---|---|---|
| `id` | string (cuid) | — | PK |
| `slug` | string | — | **Unique**, URL-safe; may contain Hangul. |
| `title` | string | — | Required. |
| `excerpt` | string | ✓ | Short summary for list views. |
| `content` | string | — | Markdown; images embedded inline by reference. |
| `status` | `PostStatus` | — | `DRAFT` (default) or `PUBLISHED`. |
| `publishedAt` | datetime | ✓ | Stamped once, on first publish. |
| `readingTime` | int | ✓ | Minutes (~200 wpm, min 1); computed on save. |
| `viewCount` | int | — | Default 0. |
| `categoryId` | string | — | FK → Category (**required**). |
| `seriesId` | string | ✓ | FK → Series (optional). |
| `seriesOrder` | int | ✓ | Position within the series (≥ 0). |

## Relations

- **Category (required, 1):** exactly one per post.
- **Series (optional, 0..1):** at most one; detachable without deleting the post.
- **Tags (0..*):** many-to-many (`PostTags`).
- **Comments (0..*):** owned; `onDelete: Cascade`.

## Invariants & rules

- A post always has **exactly one** category ([§5.3](../spec/policies.md#53-relationships--integrity)).
- Slug is **unique** and URL-safe; reuse is rejected ([§5.2](../spec/policies.md#52-identifiers)).
- **Drafts are private** — never listed or reachable by a reader on any surface,
  including by direct slug ([§5.1](../spec/policies.md#51-content-visibility)).
- Public listings are ordered newest-first by `publishedAt`.
- Deleting a post cascades to its comments ([§5.3](../spec/policies.md#53-relationships--integrity)).

## Indexes

`@@index([status, publishedAt])`, `@@index([categoryId])`, `@@index([seriesId])`;
unique on `slug`.
