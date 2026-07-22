'use client';

import { useSyncExternalStore } from 'react';

/**
 * Client-only "hidden listings" store (hh-style eye/hide). Persisted in
 * localStorage under `ishbor_hidden` so a hidden vacancy stays hidden across
 * reloads. Same memoised-read pattern as `favorites.ts` to keep
 * useSyncExternalStore references stable.
 */
const KEY = 'ishbor_hidden';
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

function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage full / disabled — ignore */
  }
  listeners.forEach((l) => l());
}

export const hiddenJobs = {
  get: read,
  has: (id: string) => read().includes(id),
  hide(id: string) {
    const cur = read();
    if (!cur.includes(id)) write([...cur, id]);
  },
  unhide(id: string) {
    const cur = read();
    if (cur.includes(id)) write(cur.filter((x) => x !== id));
  },
  clear() {
    write([]);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Reactive list of hidden ids. */
export function useHiddenJobs(): string[] {
  return useSyncExternalStore(hiddenJobs.subscribe, read, () => EMPTY);
}
