import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/**
 * Local disk storage for user-uploaded images (avatars, profile covers,
 * portfolio previews).
 *
 * Files are served back as `/uploads/<name>` — a RELATIVE path, which is what
 * gets stored in Mongo. Keeping the origin out of the database means moving
 * the API to another domain doesn't strand every previously-uploaded image
 * behind a dead hostname; the client re-attaches its own API base at render
 * time (`frontend/src/lib/images.ts`).
 */

/** URL prefix the static handler in `app.ts` serves this directory under. */
export const UPLOAD_URL_PREFIX = '/uploads';

/**
 * Allowed formats, keyed by the extension we write.
 *
 * SVG is deliberately absent and must stay that way: an SVG is a document,
 * not just a bitmap — it can carry `<script>`, and a victim who opens the
 * image URL directly would execute it on this origin. Every format here is
 * a binary raster format with no scripting surface.
 */
const ALLOWED_FORMATS = [
  { ext: 'jpg', mime: 'image/jpeg', matches: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: 'png',
    mime: 'image/png',
    matches: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    ext: 'gif',
    mime: 'image/gif',
    matches: (b: Buffer) => b.subarray(0, 6).toString('latin1').match(/^GIF8[79]a$/) !== null,
  },
  {
    ext: 'webp',
    mime: 'image/webp',
    matches: (b: Buffer) =>
      b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  {
    ext: 'avif',
    mime: 'image/avif',
    matches: (b: Buffer) =>
      b.subarray(4, 8).toString('latin1') === 'ftyp' &&
      b.subarray(8, 12).toString('latin1').includes('avi'),
  },
] as const;

export const ALLOWED_MIME_TYPES = ALLOWED_FORMATS.map((f) => f.mime);

/**
 * Identifies the format from the file's own leading bytes.
 *
 * The browser-supplied `Content-Type` and the original filename are both
 * attacker-controlled, so neither is trusted for anything: a `.png` request
 * carrying an HTML payload would otherwise land on disk with a `.png`
 * extension and be served back as `image/png`. Sniffing the magic bytes is
 * what actually decides the extension we write.
 */
export function detectImageFormat(buffer: Buffer): { ext: string; mime: string } | null {
  if (buffer.length < 12) return null;
  const match = ALLOWED_FORMATS.find((format) => format.matches(buffer));
  return match ? { ext: match.ext, mime: match.mime } : null;
}

/** Absolute path of the upload directory (created on demand). */
export function uploadDir(): string {
  return path.resolve(env.uploadDir);
}

async function ensureUploadDir(): Promise<string> {
  const dir = uploadDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Writes an uploaded image and returns its public relative URL.
 * Throws if the bytes aren't a recognised raster image.
 */
export async function saveImage(buffer: Buffer): Promise<{ url: string; bytes: number; mime: string }> {
  const format = detectImageFormat(buffer);
  if (!format) throw new Error('Unsupported image format.');

  const dir = await ensureUploadDir();
  // Random name, never the caller's filename — that would let a caller pick
  // the path (`../`), collide with someone else's file, or leak the name of
  // whatever was on their disk.
  const filename = `${crypto.randomUUID()}.${format.ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);

  return { url: `${UPLOAD_URL_PREFIX}/${filename}`, bytes: buffer.length, mime: format.mime };
}

/** True for values this server itself stored (as opposed to an external URL). */
export function isInternalUpload(value: string | null | undefined): boolean {
  return typeof value === 'string' && INTERNAL_UPLOAD_RE.test(value);
}

/**
 * `/uploads/<uuid>.<ext>` and nothing else. Anchored, with no path separators
 * inside the name, so a stored value can never walk out of the upload
 * directory when `deleteImage` turns it back into a filesystem path.
 */
export const INTERNAL_UPLOAD_RE = /^\/uploads\/[a-f0-9-]{36}\.(jpg|png|gif|webp|avif)$/;

/**
 * Best-effort delete of a previously stored upload — used when an image is
 * replaced or its owning record is removed, so the disk doesn't accumulate
 * orphans. Silently ignores anything that isn't one of our own files
 * (external URLs, already-deleted paths).
 */
export async function deleteImage(value: string | null | undefined): Promise<void> {
  if (!isInternalUpload(value)) return;

  const filename = path.basename(value as string);
  try {
    await fs.unlink(path.join(uploadDir(), filename));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    // Already gone is the expected case on double-delete — not worth a log line.
    if (code !== 'ENOENT') logger.warn(`Could not delete upload ${filename}: ${String(err)}`);
  }
}
