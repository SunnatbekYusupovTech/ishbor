import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { verifyAuthToken, type AuthTokenPayload } from '@/utils/jwt';
import { Session } from '@/models/Session';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/**
 * Real-time anti-cheat monitor.
 *
 * The client emits a `heartbeat` on an interval. If we stop receiving beats
 * (tab closed, network dropped, dev-tools throttling, machine sleep) within
 * `HEARTBEAT_TIMEOUT_MS`, we consider the candidate to have abandoned the
 * secure environment and TERMINATE their in-progress session server-side.
 */

interface SocketAuth extends AuthTokenPayload {
  sessionId: string;
}

// Extend the socket with our authenticated context.
interface MonitoredSocket extends Socket {
  data: {
    auth?: SocketAuth;
    heartbeatTimer?: NodeJS.Timeout;
  };
}

async function terminateSession(sessionId: string, userId: string, reason: string): Promise<boolean> {
  // Atomic guard: only terminate a session that is still in-progress.
  const result = await Session.updateOne(
    { _id: sessionId, userId, status: 'in-progress' },
    { $set: { status: 'terminated', terminationReason: reason, endTime: new Date() } },
  );
  return result.modifiedCount > 0;
}

export function initAntiCheatSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigin, methods: ['GET', 'POST'] },
    pingTimeout: 20_000,
  });

  // --- Handshake authentication: reject unauthenticated sockets. ---
  io.use((socket, next) => {
    const { token, sessionId } = socket.handshake.auth as {
      token?: string;
      sessionId?: string;
    };

    if (!token || !sessionId) {
      return next(new Error('Missing auth token or sessionId'));
    }

    try {
      const payload = verifyAuthToken(token);
      (socket as MonitoredSocket).data.auth = { ...payload, sessionId };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (raw: Socket) => {
    const socket = raw as MonitoredSocket;
    const auth = socket.data.auth;
    if (!auth) {
      socket.disconnect(true);
      return;
    }

    logger.info(`Anti-cheat socket connected: session ${auth.sessionId} (user ${auth.userId})`);

    /** (Re)arm the watchdog. Missing a beat terminates the session. */
    const armWatchdog = () => {
      if (socket.data.heartbeatTimer) clearTimeout(socket.data.heartbeatTimer);
      socket.data.heartbeatTimer = setTimeout(async () => {
        const killed = await terminateSession(
          auth.sessionId,
          auth.userId,
          'Heartbeat lost — candidate left the secure assessment environment.',
        );
        if (killed) {
          logger.warn(`Session ${auth.sessionId} TERMINATED: heartbeat timeout`);
          socket.emit('session:terminated', {
            reason: 'heartbeat-timeout',
          });
        }
        socket.disconnect(true);
      }, env.heartbeatTimeoutMs);
    };

    armWatchdog();

    socket.on('heartbeat', () => {
      armWatchdog();
      socket.emit('heartbeat:ack', { at: Date.now() });
    });

    // Client proactively reports a visibility violation over the socket too
    // (belt-and-suspenders with the REST /tab-switch endpoint).
    socket.on('tab-switch', async () => {
      const session = await Session.findOne({
        _id: auth.sessionId,
        userId: auth.userId,
        status: 'in-progress',
      });
      if (!session) return;

      session.tabSwitchCount += 1;
      if (session.tabSwitchCount > env.maxTabSwitches) {
        session.status = 'terminated';
        session.terminationReason = `Exceeded max tab switches (${env.maxTabSwitches}).`;
        session.endTime = new Date();
        await session.save();
        socket.emit('session:terminated', { reason: 'tab-switch-limit' });
        socket.disconnect(true);
        return;
      }
      await session.save();
      socket.emit('tab-switch:ack', {
        tabSwitchCount: session.tabSwitchCount,
        maxTabSwitches: env.maxTabSwitches,
      });
    });

    socket.on('disconnect', (reason) => {
      if (socket.data.heartbeatTimer) clearTimeout(socket.data.heartbeatTimer);
      logger.info(`Anti-cheat socket disconnected: session ${auth.sessionId} (${reason})`);
    });
  });

  return io;
}
