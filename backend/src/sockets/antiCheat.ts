import type { Server, Socket } from 'socket.io';
import { parse as parseCookieHeader } from 'cookie';
import { verifyAuthToken, type AuthTokenPayload } from '@/utils/jwt';
import { Session } from '@/models/Session';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { ACCESS_COOKIE } from '@/utils/cookies';

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

export function initAntiCheatSocket(io: Server): Server {

  // --- Handshake authentication: reject unauthenticated sockets. ---
  // The access token lives in an httpOnly cookie now, so client JS never
  // sees it — the browser attaches it to the handshake request automatically
  // (client connects with `withCredentials: true`); we read it straight off
  // the raw `Cookie` header instead of `handshake.auth.token`.
  io.use((socket, next) => {
    const { sessionId } = socket.handshake.auth as { sessionId?: string };
    const cookieHeader = socket.handshake.headers.cookie;
    const token = cookieHeader ? parseCookieHeader(cookieHeader)[ACCESS_COOKIE] : undefined;

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

    // Belt-and-suspenders companion to POST /api/test/violation — mirrors the
    // tab-switch dual-path design so a dropped HTTP request doesn't silently
    // lose a violation while the socket is still alive.
    socket.on('violation', async (payload: { type?: string }) => {
      const session = await Session.findOne({
        _id: auth.sessionId,
        userId: auth.userId,
        status: 'in-progress',
      });
      if (!session) return;

      session.violationCount += 1;
      if (session.violationCount > env.maxViolations) {
        session.status = 'terminated';
        session.terminationReason = `Exceeded max integrity violations (${env.maxViolations}).`;
        session.endTime = new Date();
        await session.save();
        socket.emit('session:terminated', { reason: 'violation-limit' });
        socket.disconnect(true);
        return;
      }
      await session.save();
      socket.emit('violation:ack', {
        violationCount: session.violationCount,
        maxViolations: env.maxViolations,
        type: payload?.type,
      });
    });

    socket.on('disconnect', (reason) => {
      if (socket.data.heartbeatTimer) clearTimeout(socket.data.heartbeatTimer);
      logger.info(`Anti-cheat socket disconnected: session ${auth.sessionId} (${reason})`);
    });
  });

  return io;
}
