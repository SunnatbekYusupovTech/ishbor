'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { api } from '@/lib/api';

interface UseAntiCheatOptions {
  sessionId: string;
  enabled: boolean;
  socket: Socket | null;
  /** Called when the backend terminates the session (limit exceeded). */
  onTerminated: (reason: string) => void;
}

interface AntiCheatCounts {
  tabSwitchCount: number;
  maxTabSwitches: number | null;
}

interface AntiCheatState extends AntiCheatCounts {
  /** Manually report a violation (e.g. leaving fullscreen). */
  report: () => void;
}

/**
 * Detects the candidate leaving the secure environment via the Page Visibility
 * API (`visibilitychange`) and window `blur`. Each violation is reported to the
 * backend (source of truth), which decides whether to terminate the session.
 *
 * We debounce so a single tab-away doesn't double-count from both events.
 */
export function useAntiCheat({
  sessionId,
  enabled,
  socket,
  onTerminated,
}: UseAntiCheatOptions): AntiCheatState {
  const [state, setState] = useState<AntiCheatCounts>({
    tabSwitchCount: 0,
    maxTabSwitches: null,
  });

  // Prevents blur + visibilitychange firing as two violations for one event.
  const lockRef = useRef(false);

  const reportViolation = useCallback(async () => {
    if (lockRef.current) return;
    lockRef.current = true;
    // Release the lock shortly after; a genuine second switch will re-fire.
    setTimeout(() => {
      lockRef.current = false;
    }, 750);

    // Notify over socket too (belt-and-suspenders); REST call is authoritative.
    socket?.emit('tab-switch');

    try {
      const res = await api.recordTabSwitch(sessionId);
      setState({ tabSwitchCount: res.tabSwitchCount, maxTabSwitches: res.maxTabSwitches });
      if (res.terminated) {
        onTerminated('Too many tab switches — assessment terminated.');
      }
    } catch {
      // Network hiccup: don't crash the exam UI. The heartbeat watchdog and a
      // repeated violation will still enforce integrity.
    }
  }, [sessionId, socket, onTerminated]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.hidden) void reportViolation();
    };
    const handleBlur = () => void reportViolation();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, reportViolation]);

  return { ...state, report: reportViolation };
}
