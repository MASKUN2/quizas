import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { deletePost, updatePost } from '../../../actions';
import { getAdminPost, getCategories, getSeriesList } from '@/lib/api';
import { isAuthed } from '@/lib/auth';
import { BodyEditor } from '@/components/body-editor';

export const metadata: Metadata = { title: 'Edit post' };

const field = 'rounded-md border border-border bg-background px-3 py-2';

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await isAuthed())) redirect('/admin/login');
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [post, categories, series] = await Promise.all([
    getAdminPost(id),
    getCategories(),
    getSeriesList(),
  ]);
  if (!post) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Edit post</h1>
        <Link href="/admin" className="text-sm text-muted hover:underline">
          ← Back
        </Link>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600">
          Save failed. Please check your input.
        </p>
      ) : null}

      <form action={updatePost} className="mt-8 flex flex-col gap-4">
        <input type="hidden" name="id" value={post.id} />
        <input
          name="title"
          placeholder="Title"
          required
          defaultValue={post.title}
          className={field}
        />
        <input
          name="excerpt"
          placeholder="Excerpt (optional)"
          defaultValue={post.excerpt ?? ''}
          className={field}
        />

        <select
          name="categoryId"
          required
          defaultValue={post.category.id}
          className={field}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {series.length > 0 ? (
          <div className="flex gap-3">
            <select
              name="seriesId"
              defaultValue={post.series?.id ?? ''}
              className={`${field} flex-1`}
            >
              <option value="">No series</option>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
            <input
              name="seriesOrder"
              type="number"
              min={0}
              placeholder="Order"
              defaultValue={post.seriesOrder ?? ''}
              className={`${field} w-24`}
            />
          </div>
        ) : null}

        <BodyEditor defaultValue={post.content} />

        <select name="status" defaultValue={post.status} className={field}>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>

        <button
          type="submit"
          className="rounded-md bg-strong px-3 py-2 text-strong-foreground hover:opacity-90"
        >
          Save
        </button>
      </form>

      <form action={deletePost} className="mt-4 border-t border-border pt-4">
        <input type="hidden" name="id" value={post.id} />
        <button className="text-sm text-red-600 hover:underline">
          Delete this post
        </button>
      </form>
    </main>
  );
}
