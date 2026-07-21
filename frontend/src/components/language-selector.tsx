'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, ChevronDown } from 'lucide-react';

import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { flags } from '@/components/flags';
import { setStoredLocale } from '@/lib/locale-preference';
import { cn } from '@/lib/utils';

type LanguageMeta = { code: string; native: string };

/** Short code + endonym shown in the trigger and list. */
const LANGUAGES: Record<Locale, LanguageMeta> = {
  en: { code: 'EN', native: 'English' },
  ru: { code: 'RU', native: 'Русский' },
  uz: { code: 'UZ', native: "O'zbekcha" },
};

export interface LanguageSelectorProps {
  /** Extra classes for the trigger button. */
  className?: string;
  /** Dropdown side alignment. Defaults to right-aligned (nav-friendly). */
  align?: 'start' | 'end';
}

/**
 * Premium, Apple-inspired language selector. Shows the active language as a
 * flag + code; opens an animated, keyboard-accessible dropdown of all locales.
 * Selecting one navigates via next-intl and mirrors the choice to localStorage.
 */
export function LanguageSelector({ className, align = 'end' }: LanguageSelectorProps) {
  const t = useTranslations('common');
  const activeLocale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const locales = routing.locales;
  const activeIndex = locales.indexOf(activeLocale);

  const select = React.useCallback(
    (locale: Locale) => {
      setStoredLocale(locale);
      setOpen(false);
      triggerRef.current?.focus();
      if (locale !== activeLocale) {
        router.replace(pathname, { locale });
      }
    },
    [activeLocale, pathname, router],
  );

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Move focus into the list when it opens, starting on the active language.
  React.useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  function focusOption(index: number) {
    const count = locales.length;
    const next = (index + count) % count;
    optionRefs.current[next]?.focus();
  }

  function onTriggerKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onListKeyDown(event: React.KeyboardEvent, index: number) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusOption(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusOption(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusOption(0);
        break;
      case 'End':
        event.preventDefault();
        focusOption(locales.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  }

  const ActiveFlag = flags[activeLocale];

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language')}
        className={cn(
          'group inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2.5 py-1.5',
          'text-sm font-medium text-foreground shadow-sm backdrop-blur-sm',
          'transition-all duration-200 ease-out hover:border-border hover:bg-muted hover:shadow',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          open && 'border-border bg-muted shadow',
          className,
        )}
      >
        <span className="flex h-3.5 w-5 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
          <ActiveFlag className="h-full w-full" />
        </span>
        <span className="tracking-wide">{LANGUAGES[activeLocale].code}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200 ease-out',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      <div
        role="listbox"
        aria-label={t('language')}
        tabIndex={-1}
        className={cn(
          'absolute z-50 mt-2 min-w-[11rem] origin-top overflow-hidden rounded-2xl border border-border/70 bg-popover p-1.5 shadow-xl',
          'transition-all duration-200 ease-out',
          align === 'end' ? 'right-0' : 'left-0',
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-y-1 scale-95 opacity-0',
        )}
      >
        {locales.map((locale, index) => {
          const Flag = flags[locale];
          const isActive = locale === activeLocale;
          const meta = LANGUAGES[locale];
          return (
            <button
              key={locale}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              type="button"
              role="option"
              aria-selected={isActive}
              tabIndex={open ? 0 : -1}
              onClick={() => select(locale)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  select(locale);
                } else {
                  onListKeyDown(event, index);
                }
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm',
                'transition-colors duration-200 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground',
              )}
            >
              <span className="flex h-4 w-6 shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
                <Flag className="h-full w-full" />
              </span>
              <span className="flex-1 font-medium">{meta.native}</span>
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">
                {meta.code}
              </span>
              <Check
                className={cn(
                  'h-4 w-4 shrink-0 text-primary transition-opacity duration-200',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
