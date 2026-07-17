import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Idempotent + self-healing: `update` mirrors `create`, so re-running keeps
// existing rows in sync with the seed definition (backfills missing fields).
async function main() {
  const categoryDefs = [
    { slug: 'planning', name: '기획', description: '기획 이야기' },
    { slug: 'life', name: '일상', description: '하루하루의 기록' },
    { slug: 'essay', name: '에세이', description: '생각과 단상' },
  ];
  const categories = {};
  for (const c of categoryDefs) {
    categories[c.slug] = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: c,
    });
  }

  // 기본 태그 (신규 DB 편의용). 실제 글은 에디터/이관으로 생성한다.
  const tagDefs = [
    { slug: 'typescript', name: 'TypeScript' },
    { slug: 'nestjs', name: 'NestJS' },
    { slug: 'retrospective', name: '회고' },
  ];
  for (const t of tagDefs) {
    await prisma.tag.upsert({
      where: { slug: t.slug },
      update: { name: t.name },
      create: t,
    });
  }

  // 플레이스홀더 글은 두지 않는다 (실제 콘텐츠는 에디터/이관으로).

  console.log('Seed complete:', {
    categories: await prisma.category.count(),
    tags: await prisma.tag.count(),
    posts: await prisma.post.count(),
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
