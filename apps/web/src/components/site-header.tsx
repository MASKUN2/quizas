import Link from 'next/link';
import { HeaderMenu } from '@/components/header-menu';

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-4 text-sm">
        <Link href="/" className="font-semibold tracking-tight">
          quizas
        </Link>
        <div className="flex items-center gap-4 text-muted">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <Link href="/series" className="hover:text-foreground">
            Series
          </Link>
          <HeaderMenu />
        </div>
      </nav>
    </header>
  );
}
