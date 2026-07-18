import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from '@/routes';
import { notFoundHandler, errorHandler } from '@/middleware/errorHandler';
import { env } from '@/config/env';

/** Builds the configured Express application (no side effects / no listen). */
export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', routes);

  // 404 + centralised error handling (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
