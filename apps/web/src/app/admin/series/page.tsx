import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSeries, deleteSeries } from '../actions';
import { getSeriesList } from '@/lib/api';
import { isAuthed } from '@/lib/auth';

export const metadata: Metadata = { title: 'Manage series' };

const field = 'rounded-md border border-border bg-background px-3 py-2';

export default async function AdminSeriesPage() {
  if (!(await isAuthed())) redirect('/admin/login');
  const series = await getSeriesList();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Manage series</h1>
        <Link href="/admin" className="text-sm text-muted hover:underline">
          ← Manage posts
        </Link>
      </div>

      <form action={createSeries} className="mt-8 flex flex-col gap-3">
        <input name="title" placeholder="Series title" required className={field} />
        <input name="description" placeholder="Description (optional)" className={field} />
        <button
          type="submit"
          className="self-end rounded-md bg-strong px-4 py-2 text-sm text-strong-foreground hover:opacity-90"
        >
          Add series
        </button>
      </form>

      {series.length === 0 ? (
        <p className="mt-10 text-muted">No series yet.</p>
      ) : (
        <ul className="mt-10 flex flex-col divide-y divide-border">
          {series.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/series/${s.slug}`}
                  className="font-medium hover:underline"
                >
                  {s.title}
                </Link>
                <span className="ml-2 text-xs text-muted">
                  {s._count?.posts ?? 0} posts
                </span>
              </div>
              <form action={deleteSeries}>
                <input type="hidden" name="id" value={s.id} />
                <button className="text-sm text-red-600 hover:underline">
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-muted">
        To add posts to a series, set the series and order on the post
        create/edit screen. Deleting a series does not delete its posts; they are
        only detached from the series.
      </p>
    </main>
  );
}
