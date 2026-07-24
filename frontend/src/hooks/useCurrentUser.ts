'use client';

import { useEffect, useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import { api, tokenStore } from '@/lib/api';
import type { Me } from '@/types/domain';

/**
 * Single source of truth for "who's logged in", shared by `TopHeader`,
 * `LeftSidebar` and `RightSidebar` — without this each would call `api.me()`
 * independently (3x the requests) and go stale relative to each other.
 *
 * Refetches on route change (covers login/logout navigations) and on every
 * successful `api.updateMe` (avatar/name/tier changes), via the
 * `ishbor:me-updated` event dispatched from `lib/api.ts`.
 */
export function useCurrentUser() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

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
  }, [pathname]);

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
