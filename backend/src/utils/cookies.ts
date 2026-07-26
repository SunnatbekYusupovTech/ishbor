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

const REFRESH_COOKIE_PATH = '/api/auth';

function cookieOptions(maxAge: number, path: string) {
  return {
    httpOnly: true,
    secure: env.cookieSecure ?? env.isProduction,
    sameSite: env.cookieSameSite ?? (env.isProduction ? ('none' as const) : ('lax' as const)),
    maxAge,
    path,
  };
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
