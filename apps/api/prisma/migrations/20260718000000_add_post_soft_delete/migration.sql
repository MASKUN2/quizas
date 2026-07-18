-- AlterTable: soft-delete marker for posts (null = live)
ALTER TABLE "Post" ADD COLUMN "deletedAt" TIMESTAMP(3);
