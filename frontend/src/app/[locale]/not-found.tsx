'use client';

import { SearchX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

/**
 * Catches any unmatched route under a valid `/[locale]` prefix (typos, dead
 * links, a deleted job/profile) — rendered inside `[locale]/layout.tsx`, so
 * it still gets the full dashboard chrome (header/sidebar) and i18n, unlike
 * Next's bare default 404. For paths that fail to resolve a locale at all,
 * see the root `app/not-found.tsx` instead.
 */
export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <SearchX className="h-10 w-10 text-muted-foreground/40" />
      <h1 className="mt-4 text-lg font-semibold">{t('title')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
      <Button asChild className="mt-6">
        <Link href="/">{t('backHome')}</Link>
      </Button>
    </div>
  );
}
