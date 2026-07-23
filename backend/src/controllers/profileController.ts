import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { User, ONLINE_WINDOW_MS, type IUser } from '@/models/User';
import { PortfolioItem } from '@/models/PortfolioItem';
import { Review } from '@/models/Review';
import { deleteImage } from '@/services/imageStorage';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';

/**
 * Public freelancer profile: header (cover/avatar/specialization/skills),
 * about, socials, portfolio, sidebar facts and reviews — everything the
 * `/u/<handle>` page renders, in one request.
 *
 * Read access is public; every mutating endpoint below re-scopes its query to
 * `req.user.userId`, so ownership is enforced by the query itself rather than
 * by an `if` the caller could slip past.
 */

/** A profile handle is either the `@username` or, for accounts that never set
 *  one, the raw user id. Username wins — ids are 24-hex, usernames can't be
 *  confused with them in practice, and a username lookup is the common case. */
async function resolveUser(handle: string) {
  const byUsername = await User.findOne({ username: handle.toLowerCase() }).lean();
  if (byUsername) return byUsername;
  if (Types.ObjectId.isValid(handle)) return User.findById(handle).lean();
  return null;
}

/** Drops empty/missing links so the client can render "only what's filled in". */
function publicSocials(socials: IUser['socials'] | undefined) {
  return Object.fromEntries(
    Object.entries(socials ?? {}).filter(([, v]) => typeof v === 'string' && v.trim() !== ''),
  );
}

function serializePortfolioItem(item: {
  _id: Types.ObjectId;
  title: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  link?: string;
  createdAt: Date;
}) {
  return {
    id: item._id.toString(),
    title: item.title,
    category: item.category ?? null,
    description: item.description ?? null,
    imageUrl: item.imageUrl ?? null,
    link: item.link ?? null,
    createdAt: item.createdAt,
  };
}

/**
 * GET /api/users/profile/:handle
 * PUBLIC (optionally authenticated) — `isOwner` tells the client whether to
 * render the add/edit/delete controls.
 */
export const getPublicProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await resolveUser(req.params.handle);
  if (!user) throw ApiError.notFound('Profile not found.');

  const userId = user._id.toString();
  const [portfolio, reviews] = await Promise.all([
    PortfolioItem.find({ userId: user._id }).sort({ createdAt: -1 }).lean(),
    Review.find({ targetUserId: user._id }).sort({ createdAt: -1 }).limit(100).lean(),
  ]);

  const viewerId = req.user?.userId ?? null;
  const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);

  res.status(200).json({
    success: true,
    data: {
      id: userId,
      name: user.name,
      username: user.username ?? null,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      coverUrl: user.coverUrl ?? null,
      specialization: user.specialization ?? null,
      skills: user.skills ?? [],
      about: user.about ?? null,
      socials: publicSocials(user.socials),
      country: user.country ?? null,
      language: user.language ?? null,
      timezone: user.timezone ?? null,
      memberSince: user.createdAt,
      isOnline: !!user.lastSeenAt && Date.now() - user.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
      // Assessment reputation — the same numbers the leaderboard ranks by.
      verificationLevels: user.verificationLevels,
      primaryDirection: user.primaryDirection ?? null,
      bestPercentage: user.bestPercentage,
      attempts: user.attempts,

      isOwner: viewerId === userId,
      portfolio: portfolio.map(serializePortfolioItem),
      reviews: reviews.map((r) => ({
        id: r._id.toString(),
        authorId: r.authorId.toString(),
        authorName: r.authorName,
        authorAvatarUrl: r.authorAvatarUrl ?? null,
        rating: r.rating,
        text: r.text,
        createdAt: r.createdAt,
        /** Lets the viewer edit/remove the review they themselves left. */
        isMine: !!viewerId && viewerId === r.authorId.toString(),
      })),
      reviewCount: reviews.length,
      reviewAverage: reviews.length ? Math.round((ratingSum / reviews.length) * 10) / 10 : 0,
    },
  });
});

/* ----------------------------- Portfolio CRUD ----------------------------- */

/** POST /api/users/me/portfolio — adds one work (no cap: the spec asks for unlimited). */
export const createPortfolioItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await PortfolioItem.create({ ...req.body, userId: req.user!.userId });
  res.status(201).json({ success: true, data: serializePortfolioItem(item) });
});

/**
 * PATCH /api/users/me/portfolio/:id
 * The `userId` in the filter is the authorisation check — editing someone
 * else's work simply matches nothing and 404s.
 */
export const updatePortfolioItem = asyncHandler(async (req: Request, res: Response) => {
  const updates = req.body as Record<string, unknown>;

  // Grab the outgoing preview before the write, so a replaced upload can be
  // removed from disk afterwards.
  const previousImage =
    updates.imageUrl === undefined
      ? null
      : (
          await PortfolioItem.findOne({ _id: req.params.id, userId: req.user!.userId })
            .select('imageUrl')
            .lean()
        )?.imageUrl ?? null;

  // An empty string means "clear this field", so it must `$unset` rather than
  // store `''` (which would render as an empty chip / broken <img>).
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value === '') $unset[key] = 1;
    else $set[key] = value;
  }

  const item = await PortfolioItem.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.userId },
    { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) },
    { new: true, runValidators: true },
  );
  if (!item) throw ApiError.notFound('Portfolio item not found.');

  if (previousImage && previousImage !== item.imageUrl) await deleteImage(previousImage);

  res.status(200).json({ success: true, data: serializePortfolioItem(item) });
});

/** DELETE /api/users/me/portfolio/:id */
export const deletePortfolioItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await PortfolioItem.findOneAndDelete({
    _id: req.params.id,
    userId: req.user!.userId,
  });
  if (!item) throw ApiError.notFound('Portfolio item not found.');

  // The preview file goes with the record it belonged to.
  await deleteImage(item.imageUrl);

  res.status(200).json({ success: true, data: { deleted: true } });
});

/* -------------------------------- Reviews -------------------------------- */

/**
 * POST /api/users/profile/:handle/reviews
 * One review per author per profile — posting again updates the existing one
 * (upsert on the unique `(targetUserId, authorId)` index) instead of letting
 * a single account stack ratings.
 */
export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const target = await resolveUser(req.params.handle);
  if (!target) throw ApiError.notFound('Profile not found.');

  const authorId = req.user!.userId;
  if (target._id.toString() === authorId) {
    throw ApiError.forbidden('You cannot review your own profile.');
  }

  const author = await User.findById(authorId).select('name avatarUrl').lean();
  if (!author) throw ApiError.unauthorized('User not found.');

  const { rating, text } = req.body as { rating: number; text: string };
  const review = await Review.findOneAndUpdate(
    { targetUserId: target._id, authorId },
    {
      $set: {
        rating,
        text,
        authorName: author.name,
        ...(author.avatarUrl ? { authorAvatarUrl: author.avatarUrl } : {}),
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  res.status(201).json({
    success: true,
    data: {
      id: review._id.toString(),
      authorId,
      authorName: review.authorName,
      authorAvatarUrl: review.authorAvatarUrl ?? null,
      rating: review.rating,
      text: review.text,
      createdAt: review.createdAt,
      isMine: true,
    },
  });
});

/** DELETE /api/users/me/reviews/:id — authors remove their own review. */
export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await Review.findOneAndDelete({
    _id: req.params.id,
    authorId: req.user!.userId,
  });
  if (!review) throw ApiError.notFound('Review not found.');

  res.status(200).json({ success: true, data: { deleted: true } });
});
