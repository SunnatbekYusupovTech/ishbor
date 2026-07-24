import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle for small Docker images — but ONLY
  // for a self-hosted/Docker deploy (Railway). Vercel's own builder produces
  // its own optimized function output and does not need this; forcing
  // `standalone` there changes what `next build` emits (the Dockerfile
  // manually copies `public/` + `.next/static` into `.next/standalone/` —
  // see `Dockerfile` — a step Vercel's pipeline never runs) and left dynamic
  // routes (anything not fully static, e.g. `/[locale]/u/[handle]`) 500ing
  // in production while prerendered pages kept working, since the
  // static/manifest files a running dynamic route needs weren't where the
  // request handler on Vercel expected them.
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  // Pin the tracing root to this app so standalone output lands at
  // .next/standalone/server.js even inside the npm-workspaces monorepo.
  outputFileTracingRoot: __dirname,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000',
  },
};

export default withNextIntl(nextConfig);
