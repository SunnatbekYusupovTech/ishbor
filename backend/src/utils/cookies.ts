import type { Response } from 'express';
import { env } from '@/config/env';

/**
 * The two auth tokens live in httpOnly cookies — never in the JSON response
 * body — so an XSS bug can't read them out of `localStorage`/JS memory.
 * `ACCESS_COOKIE` is sent on every request (`path: '/'`); `REFRESH_COOKIE` is
 * scoped to `/api/auth` since only `refresh`/`logout` ever need it.
 */
export const ACCESS_COOKIE = 'ishbor_token';
export const REFRESH_COOKIE = 'ishbor_refresh_token';
export const GOOGLE_STATE_COOKIE = 'ishbor_google_oauth_state';

const REFRESH_COOKIE_PATH = '/api/auth';
const GOOGLE_OAUTH_PATH = '/api/auth/google';

function cookieOptions(maxAge: number, path: string) {
  return {
    httpOnly: true,
    secure: env.cookieSecure ?? env.isProduction,
    sameSite: env.cookieSameSite ?? (env.isProduction ? ('none' as const) : ('lax' as const)),
    maxAge,
    path,
  };
}

/**
 * CSRF guard for the Google OAuth redirect handshake: `GET /auth/google`
 * mints a random `state`, stores it here (short-lived, scoped to the
 * `/auth/google*` path pair), and the callback rejects unless the `state`
 * query param it receives matches this cookie — otherwise an attacker could
 * trick a victim into completing an OAuth flow the attacker initiated
 * (login CSRF), or replay a stale authorization response.
 */
export function setGoogleOAuthStateCookie(res: Response, state: string): void {
  res.cookie(GOOGLE_STATE_COOKIE, state, cookieOptions(5 * 60 * 1000, GOOGLE_OAUTH_PATH));
}

export function clearGoogleOAuthStateCookie(res: Response): void {
  res.clearCookie(GOOGLE_STATE_COOKIE, { path: GOOGLE_OAUTH_PATH });
}

export function setAuthCookies(res: Response, token: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, token, cookieOptions(env.accessTokenTtlMs, '/'));
  res.cookie(
    REFRESH_COOKIE,
    refreshToken,
    cookieOptions(env.refreshTokenTtlDays * 24 * 60 * 60 * 1000, REFRESH_COOKIE_PATH),
  );
}

/** Clears both auth cookies (logout, account deletion, failed refresh). */
export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
}
