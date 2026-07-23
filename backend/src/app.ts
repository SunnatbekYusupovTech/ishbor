import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from '@/routes';
import { notFoundHandler, errorHandler } from '@/middleware/errorHandler';
import { sanitizeInput } from '@/middleware/sanitize';
import { globalRateLimiter } from '@/middleware/rateLimiter';
import { uploadDir, UPLOAD_URL_PREFIX } from '@/services/imageStorage';
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
      origin: (origin, callback) => {
        // No `Origin` header (curl, Postman, server-to-server) — allow.
        if (!origin || env.clientOrigins.includes(origin)) {
          callback(null, origin);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(sanitizeInput);

  // User-uploaded images, served read-only.
  //
  // Mounted OUTSIDE `/api` and ahead of `globalRateLimiter` on purpose: one
  // profile view pulls an avatar, a cover and every portfolio preview, so
  // routing images through the 200/min API budget would rate-limit ordinary
  // browsing. Only ever GET/HEAD — there is no write path here; uploads go
  // through the authenticated `POST /api/uploads/image`.
  app.use(
    UPLOAD_URL_PREFIX,
    express.static(uploadDir(), {
      index: false,
      // Filenames are content-addressed-ish (random UUID per upload) and are
      // never reused, so a long immutable cache is safe and keeps repeat
      // profile views off the disk entirely.
      maxAge: '30d',
      immutable: true,
      // Don't fall through to the 404 handler's JSON for a directory listing
      // attempt; a missing file is just a missing file.
      fallthrough: true,
      setHeaders: (res) => {
        // Belt and braces alongside helmet's global `nosniff`: these are
        // attacker-supplied bytes, so the browser must never be allowed to
        // re-interpret one as an HTML document.
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', 'inline');
      },
    }),
  );

  app.use('/api', globalRateLimiter, routes);

  // 404 + centralised error handling (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
