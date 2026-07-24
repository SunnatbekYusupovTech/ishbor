'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { api, tokenStore } from '@/lib/api';

/**
 * `/profile` is now just an alias — the unified profile lives at
 * `/u/<handle>` (stacks + portfolio + reviews + account settings all on one
 * page). This keeps old bookmarks/links working.
 */
export default function ProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace(('/login?next=/profile') as '/login');
      return;
    }
    api
      .me()
      .then((me) => router.replace(`/u/${me.username ?? me.id}` as '/'))
      .catch(() => router.replace('/login?next=/profile' as '/login'));
  }, [router]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="h-32 animate-pulse rounded-2xl border bg-muted/40" />
      <div className="h-48 animate-pulse rounded-2xl border bg-muted/40" />
    </div>
  );
}
