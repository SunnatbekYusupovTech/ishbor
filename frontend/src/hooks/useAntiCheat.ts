'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import type { ViolationType } from '@/types/test';

interface UseAntiCheatOptions {
  sessionId: string;
  enabled: boolean;
  socket: Socket | null;
  /** Called when the backend terminates the session (limit exceeded). */
  onTerminated: (reason: string) => void;
}

type ViolationKind = 'tab-switch' | ViolationType;

interface AntiCheatCounts {
  tabSwitchCount: number;
  maxTabSwitches: number | null;
  violationCount: number;
  maxViolations: number | null;
}

interface AntiCheatState extends AntiCheatCounts {
  /** Non-null right after a violation was recorded — drives the warning dialog. */
  violationDialog: ViolationKind | null;
  /** Dismiss the warning dialog (candidate acknowledged it). */
  acknowledgeViolation: () => void;
  /** Manually report a tab-switch-style violation (e.g. leaving fullscreen). */
  report: () => void;
}

/** Docked DevTools shrink the viewport relative to the outer window by roughly
 *  this much or more; anything past it is treated as "DevTools is open". */
const DEVTOOLS_SIZE_THRESHOLD_PX = 160;
/** How often we re-check the window/viewport size gap. */
const DEVTOOLS_POLL_MS = 1000;

/**
 * Detects the candidate leaving the secure environment (Page Visibility API +
 * window `blur`), clipboard misuse (copy/paste/cut), right-clicking (context
 * menu — save-image / inspect shortcuts), a PrintScreen key press, and an open
 * DevTools panel.
 *
 * PrintScreen detection is best-effort only: the OS captures the screenshot
 * before the page ever sees the keydown, so this can flag the attempt but
 * can never block it, and OS-native tools that don't use PrintScreen (macOS
 * Cmd+Shift+4, Windows Snipping Tool via Win+Shift+S) are invisible to any
 * web page — there is no browser API that observes them.
 *
 * DevTools detection is also best-effort: it only catches a *docked* panel,
 * which shrinks `window.innerWidth/innerHeight` relative to `outerWidth/
 * outerHeight`. An *undocked* (separate-window) DevTools instance, or one on
 * a second monitor, leaves the viewport untouched and is invisible to this
 * check — there is no reliable cross-browser API to detect DevTools directly.
 *
 * Every violation is reported to the backend (source of truth), which decides
 * whether to terminate the session; the client only mirrors that decision.
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
    violationCount: 0,
    maxViolations: null,
  });
  const [violationDialog, setViolationDialog] = useState<ViolationKind | null>(null);

  // Separate debounce locks so an unrelated event type can't suppress another
  // (e.g. a tab-switch shouldn't swallow a copy attempt moments later).
  const tabSwitchLockRef = useRef(false);
  const violationLockRef = useRef(false);
  // Edge-triggered: only report once per open (not on every poll tick while
  // it stays open), and re-arms once the size gap closes again.
  const devToolsOpenRef = useRef(false);

  const reportTabSwitch = useCallback(async () => {
    if (tabSwitchLockRef.current) return;
    tabSwitchLockRef.current = true;
    setTimeout(() => {
      tabSwitchLockRef.current = false;
    }, 750);

    // Notify over socket too (belt-and-suspenders); REST call is authoritative.
    socket?.emit('tab-switch');

    try {
      const res = await api.recordTabSwitch(sessionId);
      setState((s) => ({ ...s, tabSwitchCount: res.tabSwitchCount, maxTabSwitches: res.maxTabSwitches }));
      if (res.terminated) {
        onTerminated('Too many tab switches — assessment terminated.');
      } else {
        setViolationDialog('tab-switch');
      }
    } catch {
      // Network hiccup: don't crash the exam UI. The heartbeat watchdog and a
      // repeated violation will still enforce integrity.
    }
  }, [sessionId, socket, onTerminated]);

  const reportViolation = useCallback(
    async (type: ViolationType) => {
      if (violationLockRef.current) return;
      violationLockRef.current = true;
      setTimeout(() => {
        violationLockRef.current = false;
      }, 750);

      socket?.emit('violation', { type });

      try {
        const res = await api.recordViolation(sessionId, type);
        setState((s) => ({ ...s, violationCount: res.violationCount, maxViolations: res.maxViolations }));
        if (res.terminated) {
          onTerminated('Too many integrity violations — assessment terminated.');
        } else {
          setViolationDialog(type);
        }
      } catch {
        // Same reasoning as reportTabSwitch: never crash the exam on a network blip.
      }
    },
    [sessionId, socket, onTerminated],
  );

  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.hidden) void reportTabSwitch();
    };
    const handleBlur = () => void reportTabSwitch();

    const handleClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      void reportViolation('copy-paste');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      void reportViolation('right-click');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        void reportViolation('screenshot-key');
      }
    };

    const checkDevTools = () => {
      const widthGap = window.outerWidth - window.innerWidth;
      const heightGap = window.outerHeight - window.innerHeight;
      const open = widthGap > DEVTOOLS_SIZE_THRESHOLD_PX || heightGap > DEVTOOLS_SIZE_THRESHOLD_PX;

      if (open && !devToolsOpenRef.current) {
        devToolsOpenRef.current = true;
        void reportViolation('devtools');
      } else if (!open && devToolsOpenRef.current) {
        devToolsOpenRef.current = false; // re-arm — closing and reopening reports again
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('copy', handleClipboard);
    document.addEventListener('paste', handleClipboard);
    document.addEventListener('cut', handleClipboard);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    const devToolsInterval = setInterval(checkDevTools, DEVTOOLS_POLL_MS);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('copy', handleClipboard);
      document.removeEventListener('paste', handleClipboard);
      document.removeEventListener('cut', handleClipboard);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(devToolsInterval);
    };
  }, [enabled, reportTabSwitch, reportViolation]);

  const acknowledgeViolation = useCallback(() => setViolationDialog(null), []);

  return { ...state, violationDialog, acknowledgeViolation, report: reportTabSwitch };
}
