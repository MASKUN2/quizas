import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/api';
import { isAuthed } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { Comments } from '@/components/comments';
import { Markdown } from '@/components/markdown';

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ comment?: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const slug = decodeURIComponent((await params).slug);
  const post = await getPostBySlug(slug);
  if (!post) return { title: 'Post not found' };
  return { title: post.title, description: post.excerpt ?? undefined };
}

export default async function PostPage({ params, searchParams }: Params) {
  const [{ slug: rawSlug }, { comment }] = await Promise.all([
    params,
    searchParams,
  ]);
  const slug = decodeURIComponent(rawSlug);
  const post = await getPostBySlug(slug);
  if (!post || post.status !== 'PUBLISHED') notFound();
  const flash =
    comment === 'ok' ? 'ok' : comment === 'error' ? 'error' : undefined;
  const authed = await isAuthed();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-muted hover:underline underline-offset-4"
        >
          ← Back to list
        </Link>
        {authed ? (
          <Link
            href={`/admin/posts/${post.id}/edit`}
            className="text-sm text-muted hover:underline underline-offset-4"
          >
            Edit →
          </Link>
        ) : null}
      </div>

      <article className="mt-8">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link
              href={`/categories/${post.category.slug}`}
              className="rounded-full bg-subtle px-2 py-0.5 hover:opacity-80"
            >
              {post.category.name}
            </Link>
            <time dateTime={post.publishedAt ?? undefined}>
              {formatDate(post.publishedAt)}
            </time>
            {post.readingTime ? <span>· {post.readingTime} min</span> : null}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            {post.title}
          </h1>
          {post.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tags/${tag.slug}`}
                  className="hover:text-foreground"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          ) : null}
        </header>

        {post.series ? (
          <Link
            href={`/series/${post.series.slug}`}
            className="mb-8 block rounded-md border border-border bg-subtle px-4 py-3 text-sm hover:opacity-80"
          >
            <span className="text-muted">Series</span>{' '}
            <span className="font-medium">{post.series.title}</span>
            {post.seriesOrder ? (
              <span className="text-muted"> · Part {post.seriesOrder}</span>
            ) : null}
          </Link>
        ) : null}

        <Markdown>{post.content}</Markdown>
      </article>

      <Comments
        postId={post.id}
        slug={post.slug}
        comments={post.comments ?? []}
        flash={flash}
      />
    </main>
  );
}
