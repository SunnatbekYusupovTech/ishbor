'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, X } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { useAnimatedOverlay } from '@/hooks/useAnimatedOverlay';
import { useSidebarSlotContent } from '@/components/dashboard/SidebarSlotContext';
import { cn } from '@/lib/utils';

const links = [
  { href: '/', key: 'jobs' },
  { href: '/leaderboard', key: 'leaderboard' },
  { href: '/jobs/new', key: 'post' },
] as const;

/**
 * Persistent left nav — navigation + page-pushed widgets only. Everything
 * account-specific (profile menu, logout, language/theme) lives in the
 * header's avatar dropdown instead (`TopHeader`'s `UserMenu`).
 */
export function LeftSidebar({
  isAdmin,
  mobileOpen,
  onMobileClose,
}: {
  isAdmin: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const th = useTranslations('header');
  const mobileRendered = useAnimatedOverlay(mobileOpen);

  // Lock page scroll while the mobile off-canvas is mounted (including the
  // brief exit-animation window after close, so the page doesn't jump).
  useEffect(() => {
    if (!mobileRendered) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileRendered]);

  return (
    <>
      {/* Desktop — the outer column has no explicit height, so it stretches
          (default flex `align-items: stretch`) to match the row's full
          height — i.e. as tall as the page's content, not just one viewport.
          Without that it was capped to `100dvh-4rem` and visibly "ran out"
          partway down a longer page. The inner div is what's actually
          `sticky`+scrollable, bounded to the viewport so long nav content
          scrolls independently instead of pushing the header down. */}
      <aside className="hidden shrink-0 lg:block lg:w-64 lg:border-r lg:bg-background">
        <div className="scrollbar-hide flex h-full flex-col p-4 lg:sticky lg:top-16 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto">
          <SidebarNavContent isAdmin={isAdmin} />
        </div>
      </aside>

      {/* Mobile — fullscreen off-canvas, same slide-in-from-left pattern the
          old `SiteNav` mobile menu used. */}
      {mobileRendered && (
        <nav
          className={cn(
            'scrollbar-hide fixed inset-0 z-50 h-dvh w-full overflow-y-auto bg-background p-4 duration-300 lg:hidden',
            mobileOpen
              ? 'animate-in fade-in slide-in-from-left'
              : 'animate-out fade-out slide-out-to-left',
          )}
        >
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-lg font-bold">{th('menu')}</h2>
            <button
              type="button"
              onClick={onMobileClose}
              aria-label={th('close')}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <SidebarNavContent isAdmin={isAdmin} onNavigate={onMobileClose} />
        </nav>
      )}
    </>
  );
}

/** The actual nav — shared verbatim by the desktop and mobile wrappers. */
function SidebarNavContent({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const slotContent = useSidebarSlotContent();

  const navItemCls = (active: boolean) =>
    cn(
      'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
      active ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
    );

  return (
    <div className="flex flex-1 flex-col gap-1">
      <nav className="flex flex-col gap-1">
        {links.map((l) => (
          <Link key={l.href} href={l.href} onClick={onNavigate} className={navItemCls(pathname === l.href)}>
            {t(l.key)}
          </Link>
        ))}
        {isAdmin && (
          <Link href="/admin" onClick={onNavigate} className={navItemCls(pathname.startsWith('/admin'))}>
            <Shield className="h-4 w-4" />
            {t('admin')}
          </Link>
        )}
      </nav>

      {/* Page-pushed content — e.g. the jobs page's filters/saved-searches/promo. */}
      {slotContent && <div className="mt-2 space-y-4 border-t pt-4">{slotContent}</div>}
    </div>
  );
}
