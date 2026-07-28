'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import { api, tokenStore, AUTH_CHANGED_EVENT } from '@/lib/api';
import type { Me } from '@/types/domain';

/**
 * Single source of truth for "who's logged in", shared by `TopHeader`,
 * `LeftSidebar` and `RightSidebar` — without this each would call `api.me()`
 * independently (3x the requests) and go stale relative to each other.
 *
 * Refetches on route change (covers login/logout navigations that land on a
 * *different* pathname) AND on the `ishbor:authed-changed` event (covers the
 * same-pathname case, e.g. logging out while already on `/` — `router.push`
 * to the current path is a no-op for `usePathname`, so the pathname effect
 * alone would never re-fire there; see `lib/api.ts#tokenStore`). Also
 * refetches on every successful `api.updateMe` (avatar/name/tier changes)
 * via the `ishbor:me-updated` event.
 */
export function useCurrentUser() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  const refresh = useCallback(() => {
    const isAuthed = !!tokenStore.get();
    setAuthed(isAuthed);
    if (isAuthed) {
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
  }, []);

  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    window.addEventListener(AUTH_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, refresh);
  }, [refresh]);

  useEffect(() => {
    const onMeUpdated = (e: Event) => {
      const updated = (e as CustomEvent<Me>).detail;
      setMe(updated);
      setIsAdmin(updated?.role === 'admin');
    };
    window.addEventListener('ishbor:me-updated', onMeUpdated);
    return () => window.removeEventListener('ishbor:me-updated', onMeUpdated);
  }, []);

  return { authed, isAdmin, me };
}
