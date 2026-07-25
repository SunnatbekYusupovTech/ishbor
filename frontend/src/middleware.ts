import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

/**
 * Diagnostic wrapper around the real (next-intl) middleware — added while
 * chasing the `/[locale]/u/[handle]` 500 in production: Vercel's Function
 * logs showed nothing at all for those requests, and the response carried
 * `X-Matched-Path: /500`, suggesting the platform's edge routing served a
 * static fallback WITHOUT invoking this middleware (which runs on Vercel's
 * Edge Runtime, logged separately from serverless Function logs — check
 * "Edge" as the source when filtering Vercel's log viewer).
 *
 * If this log line is MISSING for a failing request → the failure happens
 * before Vercel ever reaches our deployment's routing at all (build/output
 * config issue). If it's PRESENT but the page still 500s → the problem is
 * further downstream (rendering), and `instrumentation.ts`'s
 * `onRequestError` should have caught it instead.
 */
export default function middleware(request: NextRequest) {
  // eslint-disable-next-line no-console -- intentional diagnostic, see comment above.
  console.log('[middleware]', request.method, request.nextUrl.pathname);
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except API routes, Next internals, static files
  // (anything with a dot), and Next's generated metadata routes (`app/
  // icon.tsx` etc. serve at un-prefixed paths like `/icon` — no dot, so
  // they'd otherwise get redirected to a locale-prefixed 404).
  matcher: ['/((?!api|_next|_vercel|icon|apple-icon|opengraph-image|twitter-image|.*\\..*).*)'],
};
