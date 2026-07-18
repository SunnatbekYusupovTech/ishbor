'use client';

import { useEffect } from 'react';

interface UseExamLockdownOptions {
  enabled: boolean;
}

/**
 * Client-side deterrents during an active assessment:
 *  - blocks the context menu,
 *  - blocks copy / cut / paste,
 *  - blocks text selection dragging,
 *  - swallows common dev-tools / view-source / print shortcuts.
 *
 * These raise the effort bar for casual cheating. They are NOT a security
 * boundary — the server remains the source of truth. Combined with the
 * heartbeat + tab-switch enforcement, they make the environment meaningfully
 * harder to game.
 */
export function useExamLockdown({ enabled }: UseExamLockdownOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const prevent = (e: Event) => e.preventDefault();

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      // F12 dev tools
      if (e.key === 'F12') return e.preventDefault();
      // Ctrl/Cmd+Shift+I / J / C (dev tools / inspector)
      if (ctrlOrMeta && e.shiftKey && ['i', 'j', 'c'].includes(key)) return e.preventDefault();
      // Ctrl/Cmd+U (view source), +P (print), +S (save), +C/X/V (copy/cut/paste)
      if (ctrlOrMeta && ['u', 'p', 's', 'c', 'x', 'v'].includes(key)) return e.preventDefault();
    };

    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);
    document.addEventListener('paste', prevent);
    document.addEventListener('dragstart', prevent);
    document.addEventListener('keydown', onKeyDown);

    // Discourage text selection during the exam.
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('cut', prevent);
      document.removeEventListener('paste', prevent);
      document.removeEventListener('dragstart', prevent);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.userSelect = prevUserSelect;
    };
  }, [enabled]);
}
