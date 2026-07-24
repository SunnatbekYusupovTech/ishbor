import http from 'node:http';
import { createApp } from '@/app';
import { connectDatabase, disconnectDatabase } from '@/config/db';
import { initAntiCheatSocket } from '@/sockets/antiCheat';
import { scheduleUploadCleanup } from '@/services/uploadCleanup';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  // Attach the real-time anti-cheat monitor to the same HTTP server.
  initAntiCheatSocket(server);

  // Periodic housekeeping for images uploaded but never saved (edit dialog
  // opened, picture chosen, dialog closed) — nothing else would remove those.
  scheduleUploadCleanup();

  server.listen(env.port, () => {
    logger.info(`🚀 API + Socket.io listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  // --- Graceful shutdown ---
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // Force-exit if cleanup hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('Fatal boot error', err);
  process.exit(1);
});
