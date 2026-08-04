'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Smooth (inertia) scrolling for the whole page, mounted once at the root
 * layout. Renders nothing — just drives the window's native scroll via
 * Lenis's own rAF loop. Skipped entirely under `prefers-reduced-motion` so
 * motion-sensitive users keep instant/native scroll.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
