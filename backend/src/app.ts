import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from '@/routes';
import { notFoundHandler, errorHandler } from '@/middleware/errorHandler';
import { sanitizeInput } from '@/middleware/sanitize';
import { env } from '@/config/env';

/** Builds the configured Express application (no side effects / no listen). */
export function createApp(): Application {
  const app = express();

  // Behind a hosting proxy (Railway, Render, Fly, Heroku...) the real client IP
  // arrives in `X-Forwarded-For`. Trust exactly one proxy hop so `req.ip` — and
  // therefore express-rate-limit's per-client keying — reflects the real caller
  // instead of the proxy. Without this the rate limiter throws a validation
  // error / buckets every user together. Only trust the proxy in production;
  // locally there is no proxy and trusting a spoofable header would be wrong.
  if (env.isProduction) {
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      // This server only ever emits JSON (see errorHandler/notFoundHandler) —
      // it never renders HTML, so there's nothing a script/style/img directive
      // should ever be allowed to load. Locking `default-src` to 'none' means
      // even an accidental HTML reflection (e.g. a stack trace echoed as text)
      // can't execute anything in a browser.
      contentSecurityPolicy: {
        directives: { defaultSrc: ["'none'"] },
      },
      // The frontend runs on a different origin (`env.clientOrigin`) and
      // fetches this API directly — helmet's same-origin default would be
      // wrong here, so it's explicit rather than accidentally restrictive.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // HSTS only makes sense once we're actually served over HTTPS in
      // production; forcing it in local dev (plain http://localhost) would
      // just be a header with no effect, so it's conditional rather than
      // silently wrong.
      hsts: env.isProduction
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    }),
  );
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(sanitizeInput);

  app.use('/api', routes);

  // 404 + centralised error handling (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
