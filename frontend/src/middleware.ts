import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except API routes, Next internals, static files
  // (anything with a dot), and Next's generated metadata routes (`app/
  // icon.tsx` etc. serve at un-prefixed paths like `/icon` — no dot, so
  // they'd otherwise get redirected to a locale-prefixed 404).
  matcher: ['/((?!api|_next|_vercel|icon|apple-icon|opengraph-image|twitter-image|.*\\..*).*)'],
};
