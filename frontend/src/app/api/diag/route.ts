import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

// Never statically optimized — must actually run as a function every time.
export const dynamic = 'force-dynamic';

/**
 * TEMPORARY diagnostic endpoint — added while chasing the `/[locale]/u/
 * [handle]` 500 in production, where Vercel's Function logs showed nothing
 * and the response carried `X-Matched-Path: /500` (server routing served a
 * static fallback without invoking any of our code). This is a real Route
 * Handler (a genuine serverless Function, same class as the pages that are
 * failing), so hitting it tells us decisively:
 *
 *   - This ALSO 500s / shows `X-Matched-Path: /500` → NO function on this
 *     deployment works at all — the build/deploy output itself is broken
 *     (wrong Root/Output Directory, corrupted build, etc.), unrelated to
 *     anything in application code.
 *   - This returns 200 with real data → functions work fine in general, and
 *     the `/u/[handle]` route specifically has its own problem — the
 *     `cwdContents`/`checks` below then show exactly which expected build
 *     files are missing relative to where the function actually runs.
 *
 * DELETE this route once the root cause is found — it exposes filesystem
 * layout and env var names (not secret values) and has no reason to exist
 * long-term.
 */
export async function GET() {
  const cwd = process.cwd();

  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    cwd,
    platform: process.platform,
    nodeVersion: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_REGION: process.env.VERCEL_REGION,
      NEXT_RUNTIME: process.env.NEXT_RUNTIME,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    },
  };

  try {
    result.cwdContents = fs.readdirSync(cwd);
  } catch (err) {
    result.cwdContentsError = err instanceof Error ? err.message : String(err);
  }

  // Paths that MUST exist for a working Next.js server, relative to `cwd`.
  // If any of these are `false`, that's the smoking gun.
  const pathsToCheck = [
    '.next',
    '.next/server',
    '.next/server/app',
    '.next/static',
    '.next/standalone',
    '.next/BUILD_ID',
    'public',
    'node_modules/next',
  ];
  const existence: Record<string, boolean> = {};
  for (const rel of pathsToCheck) {
    existence[rel] = fs.existsSync(path.join(cwd, rel));
  }
  result.pathsExist = existence;

  return NextResponse.json(result);
}
