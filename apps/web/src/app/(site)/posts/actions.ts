'use server';

import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Public: submit a comment. It stays hidden until an admin approves it. */
export async function createComment(formData: FormData) {
  const slug = String(formData.get('slug') ?? '');
  const payload = {
    postId: String(formData.get('postId') ?? ''),
    content: String(formData.get('content') ?? ''),
    authorName: String(formData.get('authorName') ?? ''),
    authorEmail: String(formData.get('authorEmail') ?? '').trim() || undefined,
  };

  const res = await fetch(`${API_URL}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  redirect(`/posts/${slug}?comment=${res.ok ? 'ok' : 'error'}#comments`);
}
