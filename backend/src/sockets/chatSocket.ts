import type { Server, Namespace, Socket } from 'socket.io';
import { parse as parseCookieHeader } from 'cookie';
import { verifyAuthToken } from '@/utils/jwt';
import { ACCESS_COOKIE } from '@/utils/cookies';
import { logger } from '@/utils/logger';

/**
 * Real-time chat namespace (`/chat`) — powers the employer ↔ seeker live
 * chat (and the job-application request flow). Authentication is the same
 * httpOnly access cookie the REST API uses: the browser attaches it to the
 * handshake automatically (`withCredentials: true` on the client), and we
 * read it off the raw `Cookie` header — same pattern as `sockets/antiCheat.ts`.
 *
 * Room layout:
 *   - every socket joins `user:<id>` on connect — controllers emit to it to
 *     reach a user wherever they are (even mid-navigation, no open page);
 *   - a socket additionally joins `conversation:<id>` while the chat window
 *     for that thread is open, so events can be scoped to the active view.
 *
 * Controllers emit through the shared `getChatIO()` handle instead of
 * importing a server instance (which would create a second engine on the
 * same port).
 */

let chatNamespace: Namespace | null = null;

/** For REST controllers to push events (`chat:message`, `chat:read`, ...). */
export function getChatIO(): Namespace | null {
  return chatNamespace;
}

interface AuthedChatSocket extends Socket {
  data: { userId?: string };
}

/**
 * Attaches the `/chat` namespace to the app's single shared Socket.io `Server`
 * instance (created in `index.ts` and passed to both this and `initAntiCheatSocket`).
 */
export function initChatSocket(io: Server): Namespace {
  const chat = io.of('/chat');

  chat.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie;
    const token = cookieHeader ? parseCookieHeader(cookieHeader)[ACCESS_COOKIE] : undefined;

    if (!token) return next(new Error('Missing auth token'));

    try {
      const payload = verifyAuthToken(token);
      (socket as AuthedChatSocket).data.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  chat.on('connection', (raw: Socket) => {
    const socket = raw as AuthedChatSocket;
    const userId = socket.data.userId;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    socket.join(`user:${userId}`);
    logger.info(`Chat socket connected: user ${userId}`);

    // While the chat window for a thread is open, scope events to it too.
    socket.on('chat:join', (conversationId?: string) => {
      if (typeof conversationId === 'string' && conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('chat:leave', (conversationId?: string) => {
      if (typeof conversationId === 'string' && conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Chat socket disconnected: user ${userId} (${reason})`);
    });
  });

  chatNamespace = chat;
  return chat;
}
