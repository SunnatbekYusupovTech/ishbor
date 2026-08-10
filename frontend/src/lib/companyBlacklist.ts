'use client';

import { useSyncExternalStore } from 'react';

/**
 * Client-only "hidden companies" store — powers the "Hide vacancies of this
 * company" action in the job card's More menu. Persisted in localStorage
 * (`ishzone_blacklisted_companies`) so hidden companies stay hidden across
 * reloads. Same memoised-read + `useSyncExternalStore` pattern as
 * `favorites.ts` / `hidden.ts`.
 */
const KEY = 'ishzone_blacklisted_companies';
const EMPTY: string[] = [];
const listeners = new Set<() => void>();

let cacheRaw: string | null = null;
let cacheVal: string[] = EMPTY;

function read(): string[] {
  if (typeof window === 'undefined') return EMPTY;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cacheRaw) return cacheVal;
  cacheRaw = raw;
  try {
    cacheVal = raw ? (JSON.parse(raw) as string[]) : EMPTY;
  } catch {
    cacheVal = EMPTY;
  }
  return cacheVal;
}

function write(companies: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(companies));
  } catch {
    /* storage full / disabled — ignore */
  }
  listeners.forEach((l) => l());
}

/** Normalised company key — lowercased, trimmed so "Acme" == "acme". */
function norm(name: string): string {
  return name.trim().toLowerCase();
}

export const blacklistedCompanies = {
  get: read,
  has: (name: string) => read().includes(norm(name)),
  hide(name: string) {
    const key = norm(name);
    if (!key) return;
    const cur = read();
    if (!cur.includes(key)) write([...cur, key]);
  },
  unhide(name: string) {
    const key = norm(name);
    const cur = read();
    if (cur.includes(key)) write(cur.filter((x) => x !== key));
  },
  clear() {
    write([]);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Reactive list of blacklisted (normalised) company names. */
export function useBlacklistedCompanies(): string[] {
  return useSyncExternalStore(blacklistedCompanies.subscribe, read, () => EMPTY);
}
