import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { deletePost, logout } from './actions';
import { getAllPosts } from '@/lib/api';
import { isAuthed } from '@/lib/auth';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Manage posts' };

export default async function AdminPage() {
  if (!(await isAuthed())) redirect('/admin/login');
  const posts = await getAllPosts();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Manage posts</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-muted hover:underline">
            View site
          </Link>
          <Link href="/admin/series" className="text-muted hover:underline">
            Series
          </Link>
          <Link href="/admin/comments" className="text-muted hover:underline">
            Comments
          </Link>
          <Link
            href="/admin/new"
            className="rounded-md bg-strong px-3 py-1.5 text-strong-foreground hover:opacity-90"
          >
            New post
          </Link>
          <form action={logout}>
            <button className="text-muted hover:underline">Log out</button>
          </form>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="mt-8 text-muted">No posts yet.</p>
      ) : (
        <ul className="mt-8 flex flex-col divide-y divide-border">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  {post.status === 'PUBLISHED' ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      Published
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                      Draft
                    </span>
                  )}
                  <span className="text-muted">{post.category.name}</span>
                  {post.publishedAt ? (
                    <time className="text-muted">
                      {formatDate(post.publishedAt)}
                    </time>
                  ) : null}
                </div>
                <p className="mt-1 truncate font-medium">{post.title}</p>
              </div>

              <div className="flex shrink-0 items-center gap-3 text-sm">
                <Link
                  href={`/posts/${post.slug}`}
                  className="text-muted hover:underline"
                >
                  View
                </Link>
                <Link
                  href={`/admin/posts/${post.id}/edit`}
                  className="text-muted hover:underline"
                >
                  Edit
                </Link>
                <form action={deletePost}>
                  <input type="hidden" name="id" value={post.id} />
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
