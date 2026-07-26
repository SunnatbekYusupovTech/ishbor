import { io, type Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

/**
 * Creates an authenticated anti-cheat socket. The access token travels as an
 * httpOnly cookie (`withCredentials: true` attaches it automatically to the
 * handshake request); only `sessionId` needs to go in the `auth` payload.
 * Verified server-side (`sockets/antiCheat.ts`) before any events flow.
 */
export function createAntiCheatSocket(sessionId: string): Socket {
  return io(API_URL, {
    auth: { sessionId },
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    transports: ['websocket'],
  });
}
