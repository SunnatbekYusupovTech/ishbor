'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { SiteNav } from '@/components/SiteNav';

/**
 * Decides whether the current route gets the main site's header + footer.
 * `/admin/*` is a separate console, not another page of the public site, so
 * it skips both entirely and just gets a bare container.
 *
 * Deliberately a plain pathname check in a client component rather than a
 * `(site)`/`admin` route-group split with per-group `layout.tsx` files —
 * that version broke the production build on Vercel (the main site 500'd
 * while `/admin/*` still worked) even though `next build`/`next start`
 * were clean locally; root-caused to a Vercel-build-environment-specific
 * interaction with route groups. This approach touches zero routing
 * conventions, so it can't hit that class of bug.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('common');
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return <main className="container py-6 md:py-10">{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      <main className="container flex-1 py-6 md:py-10">{children}</main>

      <footer className="border-t py-4">
        <div className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t('footer')}
        </div>
      </footer>
    </div>
  );
}
