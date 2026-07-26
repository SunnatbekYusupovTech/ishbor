import { v2 as cloudinary, type UploadApiErrorResponse, type UploadApiResponse } from 'cloudinary';
import crypto from 'node:crypto';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/**
 * Cloudinary-backed storage for user-uploaded images (avatars, profile
 * covers, portfolio previews).
 *
 * Previously these were written to the container's own disk, which is wiped
 * on every redeploy/restart on both Railway and Vercel — every uploaded
 * image was lost the moment the process cycled. Cloudinary is external,
 * persistent storage: the URL stored in Mongo (`https://res.cloudinary.com/
 * ...`) keeps working across deploys, restarts, and even a move to a
 * different host, with no volume/mount configuration on our side at all.
 */

/** Folder every upload from this app lands in, namespacing it within the Cloudinary account. */
const CLOUDINARY_FOLDER = 'ishbor-uploads';

let configured = false;

/** Configures the SDK from env on first use; throws a clear error if unset. */
function ensureConfigured(): void {
  if (configured) return;
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      '[imageStorage] Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, ' +
        'CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (see .env.example).',
    );
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  configured = true;
}

/**
 * Allowed formats, keyed by the extension/Cloudinary format we upload as.
 *
 * SVG is deliberately absent and must stay that way: an SVG is a document,
 * not just a bitmap — it can carry `<script>`, and a victim who opens the
 * image URL directly would execute it on Cloudinary's origin. Every format
 * here is a binary raster format with no scripting surface.
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
 * carrying an HTML payload would otherwise be uploaded and served back as
 * `image/png`. Sniffing the magic bytes is what actually decides the format
 * we tell Cloudinary to store it as.
 */
export function detectImageFormat(buffer: Buffer): { ext: string; mime: string } | null {
  if (buffer.length < 12) return null;
  const match = ALLOWED_FORMATS.find((format) => format.matches(buffer));
  return match ? { ext: match.ext, mime: match.mime } : null;
}

/**
 * Uploads an image to Cloudinary and returns its public URL.
 * Throws if the bytes aren't a recognised raster image, or if Cloudinary
 * itself isn't configured (see `ensureConfigured`).
 */
export async function saveImage(buffer: Buffer): Promise<{ url: string; bytes: number; mime: string }> {
  const format = detectImageFormat(buffer);
  if (!format) throw new Error('Unsupported image format.');

  ensureConfigured();

  // Random name, never the caller's filename — that would let a caller pick
  // the path, collide with someone else's asset, or leak the name of
  // whatever was on their disk.
  const publicId = crypto.randomUUID();

  const url = await new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        public_id: publicId,
        format: format.ext,
        // We already know this is a raster image (magic-byte sniffed above);
        // telling Cloudinary explicitly skips it re-guessing from the
        // (still attacker-controlled) filename we never send it anyway.
        resource_type: 'image',
        overwrite: false,
      },
      (err?: UploadApiErrorResponse, result?: UploadApiResponse) => {
        if (err || !result) return reject(err ?? new Error('Cloudinary upload returned no result.'));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });

  return { url, bytes: buffer.length, mime: format.mime };
}

/** True for values this app itself uploaded (as opposed to an external URL the user pasted). */
export function isInternalUpload(value: string | null | undefined): boolean {
  return typeof value === 'string' && INTERNAL_UPLOAD_RE.test(value);
}

/** The Cloudinary `public_id` (folder-qualified) for one of our own upload URLs, or `null`. */
export function publicIdFromUrl(value: string | null | undefined): string | null {
  if (!isInternalUpload(value)) return null;
  const match = INTERNAL_UPLOAD_RE.exec(value as string);
  return match ? `${CLOUDINARY_FOLDER}/${match[1]}` : null;
}

/** Folder every upload from this app lives in — used by the orphan sweep to list them. */
export function uploadFolder(): string {
  return CLOUDINARY_FOLDER;
}

/** Lets other modules (the orphan sweep) reuse the same configured client. */
export function cloudinaryClient(): typeof cloudinary {
  ensureConfigured();
  return cloudinary;
}

/**
 * Matches only URLs Cloudinary hands back for uploads into our own folder
 * with our own naming convention (`<uuid>.<ext>`) — never a bare prefix
 * check, so a user-pasted URL that merely starts similarly can't be mistaken
 * for one of ours and later passed to `deleteImage`.
 */
export const INTERNAL_UPLOAD_RE = new RegExp(
  `^https://res\\.cloudinary\\.com/[^/]+/image/upload/v\\d+/${CLOUDINARY_FOLDER}/` +
    '([a-f0-9-]{36})\\.(jpg|png|gif|webp|avif)$',
);

/**
 * Best-effort delete of a previously stored upload — used when an image is
 * replaced or its owning record is removed, so the Cloudinary account (and
 * its quota) doesn't accumulate orphans. Silently ignores anything that
 * isn't one of our own uploads (external URLs, already-deleted assets).
 */
export async function deleteImage(value: string | null | undefined): Promise<void> {
  const publicId = publicIdFromUrl(value);
  if (!publicId) return;

  try {
    ensureConfigured();
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    // Already gone / not configured — not worth failing the caller's request over.
    logger.warn(`Could not delete upload ${publicId}: ${String(err)}`);
  }
}
