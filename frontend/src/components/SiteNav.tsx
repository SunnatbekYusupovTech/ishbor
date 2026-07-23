'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Shield,
  MapPin,
  Heart,
  Bell,
  Menu,
  X,
  UserCircle,
  LogOut,
  Mail,
  FlaskConical,
} from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { api, tokenStore } from '@/lib/api';
import { useFavorites } from '@/lib/favorites';
import { LanguageSelector } from '@/components/language-selector';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, RatingStars } from '@/components/rating';
import { VerifiedBadge } from '@/components/badges';
import type { Me } from '@/types/domain';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAnimatedOverlay } from '@/hooks/useAnimatedOverlay';
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
  const [me, setMe] = useState<Me | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const menuRendered = useAnimatedOverlay(menuOpen);

  // Read auth state on mount + whenever the route changes (login/logout).
  useEffect(() => {
    setAuthed(!!tokenStore.get());
    if (tokenStore.get()) {
      api
        .me()
        .then((p) => {
          setIsAdmin(p?.role === 'admin');
          setMe(p);
        })
        .catch(() => {
          setIsAdmin(false);
          setMe(null);
        });
    } else {
      setIsAdmin(false);
      setMe(null);
    }
    setMenuOpen(false);
  }, [pathname]);

  // Lock page scroll while the fullscreen mobile menu is mounted (including
  // the brief exit-animation window after close, so the page doesn't jump).
  useEffect(() => {
    if (!menuRendered) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuRendered]);

  const confirmLogout = (allDevices: boolean) => {
    // Revoke the refresh token(s) server-side (best-effort) and drop both
    // local tokens — fire-and-forget so the UI doesn't wait on a round-trip.
    if (allDevices) void api.logoutAllDevices();
    else void api.logout();
    setLogoutDialogOpen(false);
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
          <span className="hidden text-lg font-extrabold tracking-tight sm:inline">Ishbor</span>
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

          {/* Far-right: profile + logout, consolidated into one dropdown. */}
          {authed && me ? (
            <UserMenu me={me} onLogoutRequest={() => setLogoutDialogOpen(true)} />
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
          in/out from the left, mirrors the jobs-page filters overlay.
          Stays mounted for `duration-300` after close so the exit
          animation can play instead of vanishing instantly. */}
      {menuRendered && (
        <nav
          className={cn(
            'fixed inset-0 z-50 h-dvh w-full overflow-y-auto bg-background p-4 duration-300 lg:hidden',
            menuOpen ? 'animate-in fade-in slide-in-from-left' : 'animate-out fade-out slide-out-to-left',
          )}
        >
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

      <LogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={confirmLogout}
      />
    </header>
  );
}

/**
 * Far-right, avatar-triggered dropdown consolidating profile + logout — the
 * previous separate profile icon and two logout/logout-all buttons are now
 * one menu, ending with logout at the bottom. Opens on a small identity
 * card (avatar, name, email, verification + rating) so the trigger doubles
 * as an at-a-glance account summary, not just a navigation shortcut.
 */
function UserMenu({ me, onLogoutRequest }: { me: Me; onLogoutRequest: () => void }) {
  const t = useTranslations('nav');
  const th = useTranslations('header');
  const tj = useTranslations('jobs');
  const tp = useTranslations('profile');
  const pathname = usePathname();
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
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={th('profile')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'rounded-full transition-shadow',
          open && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        )}
      >
        <Avatar name={me.name || '?'} size="sm" />
      </button>

      <div
        role="menu"
        className={cn(
          'absolute right-0 z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-2xl border border-border/70 bg-popover text-popover-foreground shadow-xl',
          'transition-all duration-200 ease-out',
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-y-1 scale-95 opacity-0',
        )}
      >
        {/* Identity card — avatar, name/email, role, and (if any) test result. */}
        <div className="flex items-center gap-3 border-b bg-muted/30 p-3.5">
          <Avatar name={me.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{me.name}</p>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              {me.email}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-b px-3.5 py-2.5">
          <span className="text-xs font-semibold text-muted-foreground">
            {me.role === 'seeker' ? tj('seeker') : tj('employer')}
          </span>
          <div className="flex items-center gap-2">
            {me.attempts > 0 && <RatingStars percentage={me.bestPercentage} size="sm" showValue={false} />}
            <VerifiedBadge level={me.verificationLevel} />
          </div>
        </div>

        {me.isQaTester && (
          <div className="flex items-center gap-1.5 border-b bg-primary/5 px-3.5 py-2 text-xs font-medium text-primary">
            <FlaskConical className="h-3.5 w-3.5 shrink-0" />
            {tp('qaTester')}
          </div>
        )}

        <div className="p-1.5">
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition-colors',
              pathname === '/profile'
                ? 'bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <UserCircle className="h-4 w-4" />
            {th('profile')}
          </Link>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogoutRequest();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            {t('logout')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Confirms logout, with an opt-in checkbox to end sessions on every device. */
function LogoutDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (allDevices: boolean) => void;
}) {
  const t = useTranslations('nav');
  const [allDevices, setAllDevices] = useState(false);

  // Reset the checkbox each time the dialog is (re)opened.
  useEffect(() => {
    if (open) setAllDevices(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('logoutTitle')}</DialogTitle>
        </DialogHeader>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-accent">
          <input
            type="checkbox"
            checked={allDevices}
            onChange={(e) => setAllDevices(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span>
            <span className="block font-medium">{t('logoutAllDevicesLabel')}</span>
            <span className="block text-xs text-muted-foreground">
              {t('logoutAllDevicesHint')}
            </span>
          </span>
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(allDevices)}>
            {t('confirmLogout')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
