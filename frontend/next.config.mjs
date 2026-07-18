import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle for small Docker images.
  output: 'standalone',
  // Pin the tracing root to this app so standalone output lands at
  // .next/standalone/server.js even inside the npm-workspaces monorepo.
  outputFileTracingRoot: __dirname,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000',
  },
};

export default withNextIntl(nextConfig);
