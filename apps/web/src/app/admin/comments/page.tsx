import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { deleteComment, moderateComment } from '../actions';
import { getComments } from '@/lib/api';
import { isAuthed } from '@/lib/auth';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Manage comments' };

const TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'SPAM', label: 'Spam' },
] as const;

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!(await isAuthed())) redirect('/admin/login');
  const { status } = await searchParams;
  const active = TABS.some((t) => t.key === status) ? status! : 'PENDING';
  const comments = await getComments(active);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Manage comments</h1>
        <Link href="/admin" className="text-sm text-muted hover:underline">
          ← Manage posts
        </Link>
      </div>

      <nav className="mt-6 flex gap-2 text-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/comments?status=${t.key}`}
            className={
              t.key === active
                ? 'rounded-full bg-strong px-3 py-1 text-strong-foreground'
                : 'rounded-full bg-subtle px-3 py-1 text-muted hover:opacity-80'
            }
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {comments.length === 0 ? (
        <p className="mt-8 text-muted">No comments in this status.</p>
      ) : (
        <ul className="mt-8 flex flex-col divide-y divide-border">
          {comments.map((c) => (
            <li key={c.id} className="py-5">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-medium">{c.authorName}</span>
                {c.authorEmail ? (
                  <span className="text-xs text-muted">{c.authorEmail}</span>
                ) : null}
                <time className="text-xs text-muted">
                  {formatDate(c.createdAt)}
                </time>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-foreground">
                {c.content}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                <Link
                  href={`/posts/${c.post.slug}#comments`}
                  className="hover:underline"
                >
                  {c.post.title}
                </Link>
              </div>

              <div className="mt-3 flex items-center gap-3 text-sm">
                {active !== 'APPROVED' ? (
                  <form action={moderateComment}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="status" value="APPROVED" />
                    <button className="text-green-700 hover:underline dark:text-green-400">
                      Approve
                    </button>
                  </form>
                ) : null}
                {active !== 'SPAM' ? (
                  <form action={moderateComment}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="status" value="SPAM" />
                    <button className="text-amber-700 hover:underline dark:text-amber-400">
                      Spam
                    </button>
                  </form>
                ) : null}
                {active !== 'PENDING' ? (
                  <form action={moderateComment}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="status" value="PENDING" />
                    <button className="text-muted hover:underline">
                      Set pending
                    </button>
                  </form>
                ) : null}
                <form action={deleteComment}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-red-600 hover:underline">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
