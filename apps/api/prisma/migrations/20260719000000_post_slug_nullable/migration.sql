-- Post.slug becomes nullable: drafts carry no slug; a slug is assigned on publish.
-- The unique index is unchanged — Postgres allows many NULLs, so drafts don't collide.
ALTER TABLE "Post" ALTER COLUMN "slug" DROP NOT NULL;

-- Bring existing drafts in line with the new invariant (draft = no slug).
-- Drafts are private, so clearing their slug is safe. Soft-deleted rows are left as-is.
UPDATE "Post" SET "slug" = NULL WHERE "status" = 'DRAFT' AND "deletedAt" IS NULL;
