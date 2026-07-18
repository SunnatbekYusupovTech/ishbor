import { io, type Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

/**
 * Creates an authenticated anti-cheat socket. The token + sessionId are sent in
 * the handshake `auth` payload and verified server-side before any events flow.
 */
export function createAntiCheatSocket(token: string, sessionId: string): Socket {
  return io(API_URL, {
    auth: { token, sessionId },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    transports: ['websocket'],
  });
}
