'use client';

import { useEffect, useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import { TopHeader } from '@/components/dashboard/TopHeader';
import { LeftSidebar } from '@/components/dashboard/LeftSidebar';
import { RightSidebar } from '@/components/dashboard/RightSidebar';
import { SidebarSlotProvider } from '@/components/dashboard/SidebarSlotContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Decides whether the current route gets the main site's dashboard chrome
 * (header + left nav sidebar + optional right widget sidebar). `/admin/*` is
 * a separate console, not another page of the public site, so
 * it skips all of it and just gets a bare container.
 *
 * Deliberately a plain pathname check in a client component rather than a
 * `(site)`/`admin` route-group split with per-group `layout.tsx` files —
 * that version broke the production build on Vercel (the main site 500'd
 * while `/admin/*` still worked) even though `next build`/`next start`
 * were clean locally; root-caused to a Vercel-build-environment-specific
 * interaction with route groups. This approach touches zero routing
 * conventions, so it can't hit that class of bug.
 *
 * `useCurrentUser` is called once here and passed down to `TopHeader`/
 * `LeftSidebar`/`RightSidebar` — each used to fetch `api.me()` independently
 * (triplicating the request) before this was centralized.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me, authed, isAdmin } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close the off-canvas sidebar on every navigation (link clicks inside it
  // already do this via `onNavigate`, but this also covers back/forward,
  // the search box, and any other programmatic navigation).
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    return <main className="container py-6 md:py-10">{children}</main>;
  }

  // The right widget panel is secondary info (verification/saved/quick
  // links) — only worth the screen space on the two "hub" pages, and only
  // once someone's actually signed in (handled inside `RightSidebar`).
  const showRightSidebar = pathname === '/' || pathname.startsWith('/u/');

  return (
    <SidebarSlotProvider>
      <div className="flex min-h-screen flex-col">
        <TopHeader
          me={me}
          authed={authed}
          menuOpen={mobileMenuOpen}
          onMenuToggle={() => setMobileMenuOpen((v) => !v)}
        />

        <div className="flex flex-1">
          <LeftSidebar
            isAdmin={isAdmin}
            mobileOpen={mobileMenuOpen}
            onMobileClose={() => setMobileMenuOpen(false)}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <main className="container flex-1 py-6 md:py-10">{children}</main>
          </div>

          {showRightSidebar && <RightSidebar me={me} />}
        </div>
      </div>
    </SidebarSlotProvider>
  );
}
