import multer from 'multer';
import { env } from '@/config/env';
import { ALLOWED_MIME_TYPES } from '@/services/imageStorage';

/**
 * Multipart parser for the single-image upload endpoint.
 *
 * Memory storage rather than multer's disk storage on purpose: nothing should
 * reach the filesystem until the bytes have been checked, and that check
 * (`detectImageFormat`) needs the buffer. With disk storage a rejected file
 * would already be written and would have to be cleaned up afterwards.
 *
 * The `limits.fileSize` cap is what actually protects memory — it aborts the
 * stream mid-flight, so an attacker can't force a huge allocation by lying
 * about `Content-Length`.
 */
export const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxUploadBytes,
    files: 1,
    // No text fields are expected alongside the file; refusing them keeps the
    // parser from being usable as a general-purpose form sink.
    fields: 0,
  },
  fileFilter: (_req, file, callback) => {
    // A cheap first pass only — the declared mimetype is caller-controlled, so
    // the authoritative check is the magic-byte sniff in the controller. This
    // just rejects the obvious cases before buffering the whole body.
    if (ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
}).single('file');
