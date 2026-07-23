'use client';

import { useEffect, useState } from 'react';
import { api, tokenStore } from '@/lib/api';
import { useRouter } from '@/i18n/navigation';

/**
 * Gates every `admin/*` page behind an actual role check (not just "is
 * logged in") — re-verified via `api.me()` on every mount so a revoked role
 * takes effect immediately, mirroring the backend's `requireAdmin` (which
 * never trusts a cached value either). No token, or a non-admin token,
 * redirects to `/admin/login` instead of the generic `/login` — the admin
 * panel now has its own gate.
 */
export function useAdminGuard(): boolean {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace('/admin/login');
      return;
    }
    let cancelled = false;
    api
      .me()
      .then((me) => {
        if (cancelled) return;
        if (me.role === 'admin') setReady(true);
        else router.replace('/admin/login');
      })
      .catch(() => {
        if (!cancelled) router.replace('/admin/login');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return ready;
}
