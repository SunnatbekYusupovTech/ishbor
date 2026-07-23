'use client';

import { useEffect, useState } from 'react';

/**
 * Keeps a conditionally-rendered overlay mounted for `durationMs` after
 * `open` flips to false, so an exit animation (fade-out/slide-out) can play
 * instead of the element vanishing instantly. The caller picks enter vs.
 * exit classes off `open` itself; this hook only answers "should it still
 * be in the DOM".
 */
export function useAnimatedOverlay(open: boolean, durationMs = 300): boolean {
  const [rendered, setRendered] = useState(open);

  useEffect(() => {
    if (open) {
      setRendered(true);
      return;
    }
    if (!rendered) return;
    const timer = setTimeout(() => setRendered(false), durationMs);
    return () => clearTimeout(timer);
  }, [open, durationMs, rendered]);

  return rendered;
}
