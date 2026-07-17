// Server-side base URL for the Nest API. Override with API_URL in .env.local.
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
}

export interface Series {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  _count?: { posts: number };
  posts?: Post[];
}

/** Public, approved comment as returned on a post detail. */
export interface PostComment {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  parentId: string | null;
}

/** Full comment shape for the admin moderation list. */
export interface AdminComment {
  id: string;
  content: string;
  authorName: string;
  authorEmail: string | null;
  status: 'PENDING' | 'APPROVED' | 'SPAM';
  createdAt: string;
  postId: string;
  parentId: string | null;
  post: { title: string; slug: string };
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  readingTime: number | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  category: Category;
  tags: Tag[];
  comments?: PostComment[];
  series?: Series | null;
  seriesOrder?: number | null;
}

async function getPosts(params: Record<string, string>): Promise<Post[]> {
  const qs = new URLSearchParams({ status: 'PUBLISHED', ...params });
  const res = await fetch(`${API_URL}/posts?${qs}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load posts (${res.status})`);
  return res.json();
}

export function getPublishedPosts(): Promise<Post[]> {
  return getPosts({});
}

export function getPostsByCategory(slug: string): Promise<Post[]> {
  return getPosts({ category: slug });
}

export function getPostsByTag(slug: string): Promise<Post[]> {
  return getPosts({ tag: slug });
}

// Server-only: the admin token unlocks drafts on the API's read endpoints.
// Never import this into a Client Component — it would ship the token.
function adminHeaders(): Record<string, string> {
  const token = process.env.ADMIN_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Every post regardless of status (drafts included), newest first.
 * Admin dashboard only — sends the admin token so the API returns drafts.
 */
export async function getAllPosts(): Promise<Post[]> {
  const res = await fetch(`${API_URL}/posts`, {
    cache: 'no-store',
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load posts (${res.status})`);
  return res.json();
}

/** A single post by id or slug, drafts included. Admin pages only. */
export async function getAdminPost(idOrSlug: string): Promise<Post | null> {
  const res = await fetch(`${API_URL}/posts/${encodeURIComponent(idOrSlug)}`, {
    cache: 'no-store',
    headers: adminHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load post (${res.status})`);
  return res.json();
}

/** Comments for moderation, optionally filtered by status. Admin only. */
export async function getComments(status?: string): Promise<AdminComment[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_URL}/comments${qs}`, {
    cache: 'no-store',
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load comments (${res.status})`);
  return res.json();
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/categories`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load categories (${res.status})`);
  return res.json();
}

export async function getCategory(slug: string): Promise<Category | null> {
  const res = await fetch(`${API_URL}/categories/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load category (${res.status})`);
  return res.json();
}

export async function getSeriesList(): Promise<Series[]> {
  const res = await fetch(`${API_URL}/series`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load series (${res.status})`);
  return res.json();
}

export async function getSeries(slug: string): Promise<Series | null> {
  const res = await fetch(`${API_URL}/series/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load series (${res.status})`);
  return res.json();
}

export async function getTag(slug: string): Promise<Tag | null> {
  const res = await fetch(`${API_URL}/tags/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load tag (${res.status})`);
  return res.json();
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const res = await fetch(`${API_URL}/posts/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load post (${res.status})`);
  return res.json();
}
