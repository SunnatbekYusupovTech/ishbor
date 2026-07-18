'use client';

import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const labels: Record<Locale, string> = {
  uz: "O'z",
  ru: 'Ру',
  en: 'En',
};

/** Compact locale switcher that preserves the current path. */
export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center gap-1 rounded-md border px-1 py-0.5">
      <Globe className="ml-1 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => router.replace(pathname, { locale: loc })}
          className={cn(
            'rounded px-2 py-0.5 text-xs font-medium transition-colors',
            loc === locale
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          aria-current={loc === locale ? 'true' : undefined}
        >
          {labels[loc]}
        </button>
      ))}
    </div>
  );
}
