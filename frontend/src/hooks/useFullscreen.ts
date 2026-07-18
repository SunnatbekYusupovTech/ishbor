'use client';

import { useCallback, useEffect, useState } from 'react';

interface UseFullscreenOptions {
  /** Fired when the user leaves fullscreen while the exam is active. */
  onExit?: () => void;
  enabled: boolean;
}

interface FullscreenControls {
  isFullscreen: boolean;
  request: () => Promise<void>;
  exit: () => Promise<void>;
}

/**
 * Thin wrapper over the Fullscreen API. `request()` must be called from a user
 * gesture (e.g. the "Start" button). While `enabled`, leaving fullscreen fires
 * `onExit` so the caller can treat it as a proctoring signal.
 */
export function useFullscreen({ onExit, enabled }: UseFullscreenOptions): FullscreenControls {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const request = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen can be blocked by the browser/policy; degrade gracefully.
    }
  }, []);

  const exit = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* no-op */
    }
  }, []);

  useEffect(() => {
    const onChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active && enabled) onExit?.();
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [enabled, onExit]);

  return { isFullscreen, request, exit };
}
