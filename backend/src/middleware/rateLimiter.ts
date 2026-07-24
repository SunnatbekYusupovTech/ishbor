import rateLimit from 'express-rate-limit';
import { ApiError } from '@/utils/ApiError';

/**
 * Blanket guard applied to every `/api` route (mounted first in `app.ts`,
 * ahead of any route-specific limiter). This is NOT DDoS protection — a
 * distributed flood spread across many IPs gets one bucket each and sails
 * through. It only blunts a single scripted source (or a small botnet)
 * hammering an otherwise-unlimited public endpoint (`GET /jobs`,
 * `GET /test/catalog`, ...) before a stricter, route-specific limiter would
 * ever kick in. Real volumetric DDoS mitigation belongs in front of the
 * server (Cloudflare, the host's own edge) — no amount of in-process
 * counting can absorb a flood large enough to saturate the network link.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many requests. Please slow down.'));
  },
});

/**
 * Brute-force guard for credential endpoints. Keyed by IP; a burst of failed
 * or repeated attempts from the same source gets locked out for the window
 * instead of being allowed to hammer the password hash / DB indefinitely.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many attempts. Please try again in a few minutes.'));
  },
});

/**
 * Guards the assessment endpoints (`/test/start`, `/test/submit`) against a
 * scripted client bypassing the UI entirely and hammering the API — e.g. to
 * probe the scored `percentage` as an oracle for the hidden answer key.
 * IP-keyed (same shape as `authRateLimiter`); the per-user cooldown in
 * `testController.startTest` is the complementary, harder-to-evade guard
 * since it's keyed by account rather than address.
 */
/**
 * Guards image uploads. Unlike the other endpoints, this one consumes disk —
 * a scripted client could otherwise fill the volume with 5 MB files far
 * faster than any human editing their profile. 30/hour is generous for the
 * real workflow (set an avatar, a cover, a handful of portfolio previews)
 * and useless for bulk abuse.
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many uploads. Please try again later.'));
  },
});

export const testRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many requests. Please try again in a few minutes.'));
  },
});
