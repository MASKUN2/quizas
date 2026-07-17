import { SiteHeader } from '@/components/site-header';

// Chrome for the public, visitor-facing site. The admin area lives outside this
// group and deliberately has no SiteHeader — it carries its own toolbar.
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
