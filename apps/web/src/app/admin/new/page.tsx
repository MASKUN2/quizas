import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createPost, logout } from '../actions';
import { getCategories, getSeriesList } from '@/lib/api';
import { isAuthed } from '@/lib/auth';
import { BodyEditor } from '@/components/body-editor';

export const metadata: Metadata = { title: 'New post' };

const field = 'rounded-md border border-border bg-background px-3 py-2';

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await isAuthed())) redirect('/admin/login');
  const [{ error }, categories, series] = await Promise.all([
    searchParams,
    getCategories(),
    getSeriesList(),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">New post</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="text-muted hover:underline">
            ← Back
          </Link>
          <form action={logout}>
            <button className="text-muted hover:underline">Log out</button>
          </form>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600">
          Save failed. Please check your input.
        </p>
      ) : null}

      <form action={createPost} className="mt-8 flex flex-col gap-4">
        <input name="title" placeholder="Title" required className={field} />
        <input name="excerpt" placeholder="Excerpt (optional)" className={field} />

        <select name="categoryId" required defaultValue="" className={field}>
          <option value="" disabled>
            Select category
          </option>
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
              defaultValue=""
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
              className={`${field} w-24`}
            />
          </div>
        ) : null}

        <BodyEditor />

        <select name="status" defaultValue="DRAFT" className={field}>
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
    </main>
  );
}
