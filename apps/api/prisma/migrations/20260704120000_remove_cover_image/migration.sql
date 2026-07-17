-- 본문 이미지 업로드 도입으로 커버 이미지 필드 제거 (SPEC §4.1/§4.4/§8).
-- DropColumn
ALTER TABLE "Post" DROP COLUMN "coverImage";
ALTER TABLE "Series" DROP COLUMN "coverImage";
