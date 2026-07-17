import type { Metadata } from 'next';
import Link from 'next/link';
import { getSeriesList } from '@/lib/api';

export const metadata: Metadata = { title: 'Series' };

export default async function SeriesIndexPage() {
  const series = await getSeriesList();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Series</h1>

      {series.length === 0 ? (
        <p className="mt-8 text-muted">No series yet.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-6">
          {series.map((s) => (
            <li key={s.id}>
              <Link
                href={`/series/${s.slug}`}
                className="text-lg font-semibold hover:underline underline-offset-4"
              >
                {s.title}
              </Link>
              <span className="ml-2 text-sm text-muted">
                {s._count?.posts ?? 0} posts
              </span>
              {s.description ? (
                <p className="mt-1 text-muted">{s.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
