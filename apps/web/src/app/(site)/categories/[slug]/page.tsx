import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PostList } from '@/components/post-list';
import { getCategory, getPostsByCategory } from '@/lib/api';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const slug = decodeURIComponent((await params).slug);
  const category = await getCategory(slug);
  return { title: category ? `${category.name}` : 'Category not found' };
}

export default async function CategoryPage({ params }: Params) {
  const slug = decodeURIComponent((await params).slug);
  const category = await getCategory(slug);
  if (!category) notFound();

  const posts = await getPostsByCategory(slug);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Link
        href="/"
        className="text-sm text-muted hover:underline underline-offset-4"
      >
        ← Back to list
      </Link>

      <header className="mb-12 mt-8">
        <p className="text-sm text-muted">Category</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {category.name}
        </h1>
        {category.description ? (
          <p className="mt-2 text-muted">{category.description}</p>
        ) : null}
      </header>

      <PostList posts={posts} />
    </main>
  );
}
