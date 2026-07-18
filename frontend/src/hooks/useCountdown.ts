'use client';

import { useEffect, useRef, useState } from 'react';

interface UseCountdownOptions {
  /** Absolute server deadline (ISO string). Timing is anchored to the server. */
  deadline: string;
  /** Fired exactly once when the clock reaches zero. */
  onExpire: () => void;
}

interface Countdown {
  secondsLeft: number;
  formatted: string; // MM:SS
  isExpired: boolean;
}

function format(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Strict countdown anchored to a server-provided deadline. Because it computes
 * remaining time from `Date.now()` vs the deadline (not by decrementing a
 * counter), it stays accurate even if the tab is throttled/backgrounded, and it
 * fires `onExpire` for the auto-submit.
 */
export function useCountdown({ deadline, onExpire }: UseCountdownOptions): Countdown {
  const deadlineMs = new Date(deadline).getTime();
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.round((deadlineMs - Date.now()) / 1000)),
  );
  const expiredRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    };

    tick(); // run immediately so we don't wait a second on mount
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineMs]);

  return {
    secondsLeft,
    formatted: format(secondsLeft),
    isExpired: secondsLeft <= 0,
  };
}
