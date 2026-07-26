import { notFound } from 'next/navigation';

/**
 * Catches any path under a valid `/[locale]` prefix that doesn't match a
 * real page (typos, dead links, deleted content). Without this, Next.js
 * routes an unmatched path straight to the bare root `/_not-found` instead
 * of `[locale]/not-found.tsx` — `not-found.tsx` only activates via an
 * explicit `notFound()` call from within its own segment tree, which is
 * exactly what this does.
 */
export default function CatchAll(): never {
  notFound();
}
