'use client';

import { useEffect, useRef, useState } from 'react';
import { createAntiCheatSocket } from '@/lib/socket';
import { tokenStore } from '@/lib/api';
import type { Socket } from 'socket.io-client';

interface UseHeartbeatOptions {
  sessionId: string;
  enabled: boolean;
  /** Interval between heartbeats (must be < server HEARTBEAT_TIMEOUT_MS). */
  intervalMs?: number;
  onTerminated: (reason: string) => void;
}

interface HeartbeatState {
  socket: Socket | null;
  connected: boolean;
}

/**
 * Opens the authenticated anti-cheat socket and emits a `heartbeat` on an
 * interval. If the client stops beating (tab closed / crashed / offline), the
 * server's watchdog terminates the session. Returns the live socket so the
 * anti-cheat hook can also emit over it.
 */
export function useHeartbeat({
  sessionId,
  enabled,
  intervalMs = 5000,
  onTerminated,
}: UseHeartbeatOptions): HeartbeatState {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const token = tokenStore.get();
    if (!token) return;

    const socket = createAntiCheatSocket(token, sessionId);
    socketRef.current = socket;
    force((n) => n + 1); // expose the socket to consumers on next render

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('session:terminated', (payload: { reason: string }) => {
      onTerminated(`Session terminated by server (${payload.reason}).`);
    });

    const beat = setInterval(() => {
      if (socket.connected) socket.emit('heartbeat');
    }, intervalMs);

    // Fire one immediately so the server's watchdog starts fresh.
    socket.emit('heartbeat');

    return () => {
      clearInterval(beat);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sessionId, intervalMs]);

  return { socket: socketRef.current, connected };
}
