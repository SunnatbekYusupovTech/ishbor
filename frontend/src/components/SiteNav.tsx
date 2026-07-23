'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, MapPin, Heart, Bell, Menu, X } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { api, tokenStore } from '@/lib/api';
import { useFavorites } from '@/lib/favorites';
import { LanguageSelector } from '@/components/language-selector';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const links = [
  { href: '/', key: 'jobs' },
  { href: '/leaderboard', key: 'leaderboard' },
  { href: '/jobs/new', key: 'post' },
] as const;

export function SiteNav() {
  const t = useTranslations('nav');
  const th = useTranslations('header');
  const pathname = usePathname();
  const router = useRouter();
  const favorites = useFavorites();
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Read auth state on mount + whenever the route changes (login/logout).
  useEffect(() => {
    setAuthed(!!tokenStore.get());
    if (tokenStore.get()) {
      api
        .me()
        .then((p) => setIsAdmin(p?.role === 'admin'))
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
    setMenuOpen(false);
  }, [pathname]);

  // Lock page scroll while the fullscreen mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const logout = () => {
    // Revoke the refresh token server-side (best-effort) and drop both local
    // tokens — fire-and-forget so the UI doesn't wait on a network round-trip.
    void api.logout();
    setAuthed(false);
    router.push('/');
  };

  const logoutAll = () => {
    // A stronger, less common action (signs out every other device too) —
    // confirm before firing it, unlike the single-device `logout` above.
    if (!window.confirm(t('logoutAllConfirm'))) return;
    void api.logoutAllDevices();
    setAuthed(false);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center gap-1.5 md:gap-5">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={th('menu')}
          aria-expanded={menuOpen}
          className="-ml-1 shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Brand mark — red, hh-style */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-base font-black leading-none text-brand-foreground shadow-sm">
            ish
          </span>
          <span className="hidden text-lg font-extrabold tracking-tight md:inline">Ishbor</span>
        </Link>

        {/* City selector — single-market label */}
        <button
          type="button"
          className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:inline-flex"
        >
          <MapPin className="h-4 w-4 text-primary" />
          {th('city')}
        </button>

        <nav className="ml-2 mr-auto hidden items-center gap-1 text-sm lg:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'relative rounded-md px-2.5 py-1.5 font-medium transition-colors md:px-3',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t(l.key)}
                {active && (
                  <span className="absolute inset-x-2.5 -bottom-[9px] h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
          {/* Admin-only link — role checked via api.me() */}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'relative flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium transition-colors md:px-3',
                pathname.startsWith('/admin')
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Shield className="h-3.5 w-3.5" />
              {t('admin')}
              {pathname.startsWith('/admin') && (
                <span className="absolute inset-x-2.5 -bottom-[9px] h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
          {/* Saved listings */}
          <Link
            href="/?saved=1"
            aria-label={th('favorites')}
            className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          >
            <Heart className="h-5 w-5" />
            {favorites.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {favorites.length}
              </span>
            )}
          </Link>

          <div className="hidden md:block">
            <NotificationsBell label={th('notifications')} />
          </div>

          <LanguageSelector />
          <ThemeToggle />

          {authed ? (
            <>
              <button
                onClick={logout}
                className="ml-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                {t('logout')}
              </button>
              {/* Secondary, less common action — smaller and quieter than the
                  primary logout button on purpose. */}
              <button
                onClick={logoutAll}
                className="hidden rounded-md px-2 py-1.5 text-xs text-muted-foreground/70 transition-colors hover:bg-accent hover:text-muted-foreground md:block"
                title={t('logoutAllConfirm')}
              >
                {t('logoutAll')}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="ml-1 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 md:px-3.5"
            >
              {t('login')}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav — fullscreen (full width + full height) sidebar, slides
          in from the left, mirrors the jobs-page filters overlay. */}
      {menuOpen && (
        <nav className="fixed inset-0 z-50 h-dvh w-full animate-in overflow-y-auto bg-background p-4 slide-in-from-left fade-in duration-300 lg:hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{th('menu')}</h2>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label={th('close')}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-col py-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground"
            >
              <MapPin className="h-4 w-4 text-primary" />
              {th('city')}
            </button>
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent',
                  )}
                >
                  {t(l.key)}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  pathname.startsWith('/admin')
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent',
                )}
              >
                <Shield className="h-3.5 w-3.5" />
                {t('admin')}
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

/** Notifications bell with a small empty-state popover (no backend yet). */
function NotificationsBell({ label }: { label: string }) {
  const t = useTranslations('header');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        className={cn(
          'rounded-full p-2 transition-colors hover:bg-accent hover:text-primary',
          open ? 'bg-accent text-primary' : 'text-muted-foreground',
        )}
      >
        <Bell className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg">
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t('noNotifications')}</p>
        </div>
      )}
    </div>
  );
}
