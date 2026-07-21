'use client';

import { useSyncExternalStore } from 'react';

/**
 * Client-only "saved listings" store, hh-style heart. Persisted in
 * localStorage under `ishbor_favorites` and shared across the header heart,
 * the card hearts and the sidebar counter via useSyncExternalStore.
 *
 * read() memoises the parsed array against the raw localStorage string so
 * useSyncExternalStore gets a stable reference when nothing changed (a fresh
 * array every call would trigger an infinite render loop).
 */
const KEY = 'ishbor_favorites';
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

export const favorites = {
  get: read,
  has: (id: string) => read().includes(id),
  toggle(id: string) {
    const cur = read();
    write(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Reactive list of saved ids. */
export function useFavorites(): string[] {
  return useSyncExternalStore(favorites.subscribe, read, () => EMPTY);
}

/** Reactive boolean for a single listing (primitive — no memo needed). */
export function useIsFavorite(id: string): boolean {
  return useSyncExternalStore(
    favorites.subscribe,
    () => read().includes(id),
    () => false,
  );
}
