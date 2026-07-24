import fs from 'node:fs/promises';
import path from 'node:path';
import { User } from '@/models/User';
import { PortfolioItem } from '@/models/PortfolioItem';
import { uploadDir, isInternalUpload } from '@/services/imageStorage';
import { logger } from '@/utils/logger';

/**
 * Deletes upload files that no document points at any more.
 *
 * Replacing or deleting an image cleans up eagerly (see `userController`
 * and `profileController`), but one case can't be handled there: a user
 * uploads a picture in the edit dialog — which stores it immediately, so the
 * preview can render — and then closes the dialog without saving. Nothing
 * ever references that file, and nothing else would ever remove it.
 *
 * So this sweeps the directory instead of trying to track intent. The grace
 * period is what makes it safe: a file is only a candidate once it's older
 * than `GRACE_MS`, which is far longer than the gap between "uploaded" and
 * "saved with the surrounding form". A file uploaded seconds ago is never
 * touched, even though it is momentarily unreferenced.
 */

/** How long a file is left alone before it can be considered abandoned. */
const GRACE_MS = 24 * 60 * 60 * 1000;

/** How often the sweep runs once scheduled. */
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Every upload filename currently referenced by a user or a portfolio item. */
async function referencedFilenames(): Promise<Set<string>> {
  const [users, items] = await Promise.all([
    User.find({ $or: [{ avatarUrl: /^\/uploads\// }, { coverUrl: /^\/uploads\// }] })
      .select('avatarUrl coverUrl')
      .lean(),
    PortfolioItem.find({ imageUrl: /^\/uploads\// })
      .select('imageUrl')
      .lean(),
  ]);

  const referenced = new Set<string>();
  const add = (value?: string | null) => {
    if (isInternalUpload(value)) referenced.add(path.basename(value as string));
  };

  for (const user of users) {
    add(user.avatarUrl);
    add(user.coverUrl);
  }
  for (const item of items) add(item.imageUrl);

  return referenced;
}

/** Runs one sweep. Returns how many files were removed. */
export async function sweepOrphanedUploads(): Promise<number> {
  const dir = uploadDir();

  let filenames: string[];
  try {
    filenames = await fs.readdir(dir);
  } catch {
    // Nothing uploaded yet — the directory is created on first write.
    return 0;
  }
  if (filenames.length === 0) return 0;

  const referenced = await referencedFilenames();
  const cutoff = Date.now() - GRACE_MS;
  let removed = 0;

  for (const filename of filenames) {
    if (referenced.has(filename)) continue;

    const filePath = path.join(dir, filename);
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile() || stat.mtimeMs > cutoff) continue;
      await fs.unlink(filePath);
      removed++;
    } catch {
      // Raced with another delete, or unreadable — skip it, the next sweep retries.
    }
  }

  if (removed > 0) logger.info(`Removed ${removed} abandoned upload(s).`);
  return removed;
}

/**
 * Schedules the sweep: once shortly after boot, then on a long interval.
 * `unref()` so a pending timer never keeps the process alive on shutdown.
 */
export function scheduleUploadCleanup(): void {
  const run = () => {
    void sweepOrphanedUploads().catch((err) => {
      // Housekeeping must never take the server down.
      logger.warn(`Upload cleanup failed: ${String(err)}`);
    });
  };

  // Not immediately at boot — let the DB connection settle first.
  setTimeout(run, 60_000).unref();
  setInterval(run, SWEEP_INTERVAL_MS).unref();
}
