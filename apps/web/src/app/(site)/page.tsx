import { PostList } from '@/components/post-list';
import { getPublishedPosts } from '@/lib/api';

export default async function Home() {
  const posts = await getPublishedPosts();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">quizas</h1>
        <p className="mt-2 text-muted">Notes from a developer and a person.</p>
      </header>

      <PostList posts={posts} />
    </main>
  );
}
