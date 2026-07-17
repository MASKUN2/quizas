'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Hamburger menu in the public site header — its single entry is the admin
 * link. (The admin area has no SiteHeader; it returns to the site via its own
 * toolbar.) The link is gated by auth regardless — see the /admin redirect and
 * the API guard.
 */
export function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside the menu.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:text-foreground"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 min-w-32 rounded-md border border-border bg-background py-1 shadow-sm">
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-muted hover:bg-subtle hover:text-foreground"
          >
            Admin
          </Link>
        </div>
      ) : null}
    </div>
  );
}
