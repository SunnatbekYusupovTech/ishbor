import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { saveImage, ALLOWED_MIME_TYPES } from '@/services/imageStorage';
import { uploadSingleImage } from '@/middleware/upload';
import { env } from '@/config/env';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';

/**
 * Runs the multipart parser and translates multer's own errors into the
 * API's `{ success: false, error }` shape. Without this, a too-large upload
 * surfaces as an opaque 500 instead of a 413 the UI can explain.
 */
export function parseImageUpload(req: Request, res: Response, next: NextFunction): void {
  uploadSingleImage(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const mb = Math.round((env.maxUploadBytes / (1024 * 1024)) * 10) / 10;
        return next(new ApiError(413, `Image is too large. Maximum size is ${mb} MB.`));
      }
      return next(ApiError.badRequest(`Upload failed: ${err.message}`));
    }
    if (err) return next(ApiError.badRequest('Upload failed.'));
    next();
  });
}

/**
 * POST /api/uploads/image
 * AUTHENTICATED — stores one image and returns the relative URL to put in
 * `avatarUrl` / `coverUrl` / a portfolio item's `imageUrl`.
 *
 * The upload is intentionally decoupled from the record it ends up on: the
 * client uploads first, then saves the returned URL with the rest of the
 * form. That keeps the profile and portfolio endpoints as plain JSON and
 * lets the UI show a preview before anything is committed.
 */
export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw ApiError.badRequest(
      `No image provided. Send one file in the "file" field (${ALLOWED_MIME_TYPES.join(', ')}).`,
    );
  }

  let stored;
  try {
    // Authoritative validation: the bytes themselves must be a known raster
    // format, regardless of what the request claimed.
    stored = await saveImage(req.file.buffer);
  } catch {
    throw ApiError.badRequest(
      `Unsupported image format. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}.`,
    );
  }

  res.status(201).json({ success: true, data: stored });
});
