const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

/**
 * Turns a stored image reference into something an `<img src>` can load.
 *
 * Images come in two flavours and both are stored in the same field:
 *   - an external URL the user pasted (`https://…`) — used as-is;
 *   - an internal upload (`/uploads/<uuid>.jpg`) — needs the API origin
 *     prepended, since the frontend is served from a different origin.
 *
 * The origin is deliberately NOT stored in the database (see
 * `backend/src/services/imageStorage.ts`): re-attaching it here means moving
 * the API to a new domain doesn't strand every previously-uploaded image.
 */
export function resolveImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.startsWith('/uploads/') ? `${API_URL}${value}` : value;
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
