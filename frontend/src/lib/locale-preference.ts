import { routing, type Locale } from '@/i18n/routing';

/**
 * Persisted language choice. next-intl already encodes the active locale in the
 * URL, so this is the belt-and-braces copy: it survives navigations to
 * locale-less entry points and lets other tabs/components read the preference.
 */
const KEY = 'ishbor_locale';

function isLocale(value: string | null): value is Locale {
  return value !== null && (routing.locales as readonly string[]).includes(value);
}

/** Read the saved locale, or `null` when unset/invalid or on the server. */
export function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

/** Persist the chosen locale. No-ops on the server or when storage is blocked. */
export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, locale);
  } catch {
    /* private mode / storage disabled — the URL still carries the locale */
  }
}
