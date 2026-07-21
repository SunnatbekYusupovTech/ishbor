'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shield } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { api, tokenStore } from '@/lib/api';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const links = [
  { href: '/', key: 'jobs' },
  { href: '/leaderboard', key: 'leaderboard' },
  { href: '/jobs/new', key: 'post' },
] as const;

export function SiteNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
  }, [pathname]);

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
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            I
          </div>
          <span className="hidden font-semibold tracking-tight sm:inline">Ishbor</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-md px-3 py-1.5 font-medium transition-colors hover:bg-accent',
                pathname === l.href ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {t(l.key)}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-1.5 font-medium transition-colors hover:bg-accent',
                pathname.startsWith('/admin') ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <Shield className="h-3.5 w-3.5" />
              {t('admin')}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1">
          {authed ? (
            <>
              <button
                onClick={logout}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                {t('logout')}
              </button>
              {/* Secondary, less common action — smaller and quieter than the
                  primary logout button on purpose. */}
              <button
                onClick={logoutAll}
                className="hidden rounded-md px-2 py-1.5 text-xs text-muted-foreground/70 transition-colors hover:bg-accent hover:text-muted-foreground sm:block"
                title={t('logoutAllConfirm')}
              >
                {t('logoutAll')}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
            >
              {t('login')}
            </Link>
          )}
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
