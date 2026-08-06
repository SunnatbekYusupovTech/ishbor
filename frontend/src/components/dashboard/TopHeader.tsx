'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Menu, X, Search, Bell, Mail, FlaskConical, LayoutGrid, Briefcase, Star, Settings, LogOut } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
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
import { cn, displayTier } from '@/lib/utils';

/**
 * Slim top bar — nav links/filters live in `LeftSidebar`, but the avatar
 * keeps its own dropdown (profile menu + logout) rather than being a plain
 * link: the sidebar only carries navigation + page widgets now, nothing
 * account-specific.
 */
export function TopHeader({
  me,
  authed,
  menuOpen,
  onMenuToggle,
}: {
  me: Me | null;
  authed: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
}) {
  const th = useTranslations('header');
  const t = useTranslations('nav');
  const router = useRouter();
  const [query, setQuery] = useState('');

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push((q ? `/?q=${encodeURIComponent(q)}` : '/') as '/');
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label={th('menu')}
          aria-expanded={menuOpen}
          className="-ml-1 shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-base font-black leading-none text-brand-foreground shadow-sm">
            ish
          </span>
          <span className="hidden text-lg font-extrabold tracking-tight sm:inline">Ishzone</span>
        </Link>

        <form onSubmit={onSearchSubmit} className="relative ml-2 min-w-0 max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={th('search')}
            className="h-10 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
          />
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <LanguageSelector />
          <ThemeToggle />

          <NotificationsBell label={th('notifications')} />

          {authed && me ? (
            <UserMenu me={me} />
          ) : (
            <Link
              href="/login"
              className="ml-1 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              {t('login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Far-right, avatar-triggered dropdown — profile menu + logout, nothing
 * account-specific lives outside it (the sidebar is nav/widgets only).
 */
function UserMenu({ me }: { me: Me }) {
  const th = useTranslations('header');
  const tj = useTranslations('jobs');
  const tp = useTranslations('profile');
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const handle = me.username ?? me.id;

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

  // Close the dropdown on route change (e.g. clicking one of its own links).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const confirmLogout = async (allDevices: boolean) => {
    setLogoutDialogOpen(false);
    setOpen(false);
    // Must be awaited: `api.logout()` clears the httpOnly cookie server-side
    // AND the local `ishzone_authed` marker. If we navigate before it
    // resolves, `useCurrentUser`'s pathname-triggered refetch can land
    // between "cookie still valid" and "cookie cleared" and re-hydrate the
    // UI as still logged in — the user then has to click logout 2-3 times
    // before it visibly sticks.
    if (allDevices) await api.logoutAllDevices();
    else await api.logout();
    router.push('/');
  };

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
          <Avatar name={me.name || '?'} src={me.avatarUrl} size="sm" />
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
            <Avatar name={me.name} src={me.avatarUrl} size="md" />
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
              <VerifiedBadge level={displayTier(me.verificationLevels, me.primaryDirection)} />
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
              href={`/u/${handle}#stacks` as '/'}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LayoutGrid className="h-4 w-4" />
              {th('myStacks')}
            </Link>
            <Link
              href={`/u/${handle}#portfolio` as '/'}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Briefcase className="h-4 w-4" />
              {th('myProjects')}
            </Link>
            <Link
              href={`/u/${handle}#reviews` as '/'}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Star className="h-4 w-4" />
              {th('myReviews')}
            </Link>
            <Link
              href={`/u/${handle}#account` as '/'}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              {th('accountSettings')}
            </Link>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setLogoutDialogOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              {t('logout')}
            </button>
          </div>
        </div>

        <LogoutDialog
          open={logoutDialogOpen}
          onOpenChange={setLogoutDialogOpen}
          onConfirm={confirmLogout}
        />
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
            <span className="block text-xs text-muted-foreground">{t('logoutAllDevicesHint')}</span>
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
