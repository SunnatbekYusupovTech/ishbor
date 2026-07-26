/**
 * Turns a stored image reference into something an `<img src>` can load.
 *
 * Images come in two flavours, both stored as a plain string in the same
 * field: an external URL the user pasted, or one of our own Cloudinary
 * uploads (see `backend/src/services/imageStorage.ts`). Both are already
 * full, absolute URLs, so there is nothing to resolve — this exists mainly
 * as the one place that decision would live if that ever changed again.
 */
export function resolveImageUrl(value: string | null | undefined): string | null {
  return value || null;
}

/**
 * True for a value this app itself uploaded to Cloudinary (as opposed to an
 * external URL the user pasted in). Mirrors the backend's `INTERNAL_UPLOAD_RE`
 * — same folder, same `<uuid>.<ext>` naming — so the UI can tell them apart
 * (e.g. to leave the "paste a URL" field empty for our own uploads).
 */
export function isInternalUploadUrl(value: string | null | undefined): boolean {
  return (
    !!value &&
    /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/v\d+\/ishbor-uploads\/[a-f0-9-]{36}\.(jpg|png|gif|webp|avif)$/.test(
      value,
    )
  );
}

/** Formats a byte count for upload errors/hints ("4.2 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

/** Mirrors the formats `imageStorage.ALLOWED_FORMATS` accepts server-side. */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
];

/** Value for an `<input type="file">` `accept` attribute. */
export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(',');

/** Server default (`MAX_UPLOAD_BYTES`) — checked client-side for a fast, clear error. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
