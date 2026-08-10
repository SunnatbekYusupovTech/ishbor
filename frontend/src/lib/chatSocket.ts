import { io, type Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

/**
 * One shared chat socket for the whole app (header unread badge, messages
 * page) — unlike the per-session anti-cheat socket, a chat connection is a
 * long-lived app-wide resource, so it's a lazy singleton. The access token
 * travels as an httpOnly cookie (`withCredentials: true` attaches it to the
 * handshake automatically; the server reads it off the `Cookie` header, see
 * `backend/src/sockets/chatSocket.ts`).
 *
 * `autoConnect: false` — callers connect explicitly (only when signed in) and
 * `disconnectChatSocket()` tears it down on logout, so a stale singleton
 * never outlives its session.
 */
let socket: Socket | null = null;

export function getChatSocket(): Socket {
  if (!socket) {
    socket = io(`${API_URL}/chat`, {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      transports: ['websocket'],
    });
  }
  return socket;
}

export function disconnectChatSocket(): void {
  socket?.disconnect();
  socket = null;
}
