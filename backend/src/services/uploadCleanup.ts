import { User } from '@/models/User';
import { PortfolioItem } from '@/models/PortfolioItem';
import { cloudinaryClient, isInternalUpload, uploadFolder } from '@/services/imageStorage';
import { logger } from '@/utils/logger';

/**
 * Deletes Cloudinary uploads that no document points at any more.
 *
 * Replacing or deleting an image cleans up eagerly (see `userController`
 * and `profileController`), but one case can't be handled there: a user
 * uploads a picture in the edit dialog — which stores it immediately, so the
 * preview can render — and then closes the dialog without saving. Nothing
 * ever references that upload, and nothing else would ever remove it —
 * left alone it just sits on Cloudinary counting against the account's quota
 * forever.
 *
 * So this sweeps the account's upload folder instead of trying to track
 * intent. The grace period is what makes it safe: an asset is only a
 * candidate once it's older than `GRACE_MS`, which is far longer than the
 * gap between "uploaded" and "saved with the surrounding form". An asset
 * uploaded seconds ago is never touched, even though it is momentarily
 * unreferenced.
 */

/** How long an upload is left alone before it can be considered abandoned. */
const GRACE_MS = 24 * 60 * 60 * 1000;

/** How often the sweep runs once scheduled. */
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Cloudinary lists at most this many resources per call; paginate past it. */
const PAGE_SIZE = 500;

/** Every upload `public_id` currently referenced by a user or a portfolio item. */
async function referencedPublicIds(): Promise<Set<string>> {
  const [users, items] = await Promise.all([
    User.find({ $or: [{ avatarUrl: /^https:\/\/res\.cloudinary\.com\// }, { coverUrl: /^https:\/\/res\.cloudinary\.com\// }] })
      .select('avatarUrl coverUrl')
      .lean(),
    PortfolioItem.find({ imageUrl: /^https:\/\/res\.cloudinary\.com\// })
      .select('imageUrl')
      .lean(),
  ]);

  const referenced = new Set<string>();
  const add = (value?: string | null) => {
    if (!isInternalUpload(value)) return;
    // Cloudinary's Admin API reports public_id WITHOUT the file extension.
    const match = /\/([a-f0-9-]{36})\.[a-z0-9]+$/.exec(value as string);
    if (match) referenced.add(`${uploadFolder()}/${match[1]}`);
  };

  for (const user of users) {
    add(user.avatarUrl);
    add(user.coverUrl);
  }
  for (const item of items) add(item.imageUrl);

  return referenced;
}

/** Runs one sweep. Returns how many assets were removed. */
export async function sweepOrphanedUploads(): Promise<number> {
  const cloudinary = cloudinaryClient();
  const cutoff = Date.now() - GRACE_MS;

  const referenced = await referencedPublicIds();
  const toDelete: string[] = [];
  let nextCursor: string | undefined;

  do {
    const page: {
      resources: { public_id: string; created_at: string }[];
      next_cursor?: string;
    } = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${uploadFolder()}/`,
      max_results: PAGE_SIZE,
      next_cursor: nextCursor,
    });

    for (const resource of page.resources) {
      if (referenced.has(resource.public_id)) continue;
      if (new Date(resource.created_at).getTime() > cutoff) continue;
      toDelete.push(resource.public_id);
    }
    nextCursor = page.next_cursor;
  } while (nextCursor);

  if (toDelete.length > 0) {
    // Cloudinary's batch delete caps at 100 public_ids per call.
    for (let i = 0; i < toDelete.length; i += 100) {
      await cloudinary.api.delete_resources(toDelete.slice(i, i + 100));
    }
    logger.info(`Removed ${toDelete.length} abandoned upload(s).`);
  }
  return toDelete.length;
}

/**
 * Schedules the sweep: once shortly after boot, then on a long interval.
 * `unref()` so a pending timer never keeps the process alive on shutdown.
 * No-ops (with a warning) if Cloudinary isn't configured, rather than
 * crashing the whole boot sequence over a housekeeping task.
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
