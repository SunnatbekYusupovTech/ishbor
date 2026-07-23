import type { Request, Response } from 'express';
import { User, SOCIAL_PLATFORMS, type IUser, type SocialLinks } from '@/models/User';
import { Job } from '@/models/Job';
import { Session } from '@/models/Session';
import { RefreshToken } from '@/models/RefreshToken';
import { PortfolioItem } from '@/models/PortfolioItem';
import { Review } from '@/models/Review';
import { deleteImage } from '@/services/imageStorage';
import { hashPassword, verifyPassword } from '@/utils/password';
import { TIER_RANK } from '@/services/scoringService';
import { DIRECTIONS, type Direction } from '@/config/catalog';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';

/**
 * The tier shown as a user's single headline badge (leaderboard, job posts):
 * their `primaryDirection`'s tier if they've picked one, otherwise the
 * highest tier they hold across any direction.
 */
function displayTier(user: { verificationLevels?: Record<string, string>; primaryDirection?: string }) {
  const levels = user.verificationLevels ?? {};
  if (user.primaryDirection) return levels[user.primaryDirection] ?? 'none';
  let best: string = 'none';
  for (const d of DIRECTIONS) {
    const t = levels[d] ?? 'none';
    if ((TIER_RANK[t as keyof typeof TIER_RANK] ?? 0) > (TIER_RANK[best as keyof typeof TIER_RANK] ?? 0)) {
      best = t;
    }
  }
  return best;
}

/** Every field `GET`/`PATCH /auth/me` returns — one place so the two can't drift. */
const ME_FIELDS =
  'name email role verificationLevels primaryDirection bestPercentage bestScore attempts isQaTester ' +
  'username avatarUrl coverUrl specialization skills about socials country language timezone';

type MeSource = Pick<
  IUser,
  | 'name'
  | 'email'
  | 'role'
  | 'verificationLevels'
  | 'primaryDirection'
  | 'bestPercentage'
  | 'bestScore'
  | 'attempts'
  | 'isQaTester'
  | 'username'
  | 'avatarUrl'
  | 'coverUrl'
  | 'specialization'
  | 'skills'
  | 'about'
  | 'socials'
  | 'country'
  | 'language'
  | 'timezone'
> & { _id: { toString(): string } };

function serializeMe(user: MeSource) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    verificationLevels: user.verificationLevels,
    primaryDirection: user.primaryDirection ?? null,
    bestPercentage: user.bestPercentage,
    bestScore: user.bestScore,
    attempts: user.attempts,
    isQaTester: user.isQaTester,
    // --- Public freelancer profile ---
    username: user.username ?? null,
    avatarUrl: user.avatarUrl ?? null,
    coverUrl: user.coverUrl ?? null,
    specialization: user.specialization ?? null,
    skills: user.skills ?? [],
    about: user.about ?? null,
    socials: (user.socials ?? {}) as SocialLinks,
    country: user.country ?? null,
    language: user.language ?? null,
    timezone: user.timezone ?? null,
  };
}

/**
 * GET /api/users/leaderboard
 * PUBLIC — ranks users by their best assessment result (highest score first).
 */
export const getLeaderboard = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find({ attempts: { $gt: 0 } })
    .sort({ bestPercentage: -1, bestScore: -1, updatedAt: 1 })
    .limit(50)
    .select('name verificationLevels primaryDirection bestPercentage bestScore')
    .lean();

  res.status(200).json({
    success: true,
    data: users.map((u, i) => ({
      rank: i + 1,
      name: u.name,
      verificationLevel: displayTier(u),
      primaryDirection: u.primaryDirection ?? null,
      bestPercentage: u.bestPercentage,
      bestScore: u.bestScore,
    })),
  });
});

/**
 * GET /api/auth/me
 * AUTHENTICATED — returns the current user's profile + per-direction
 * verification status so the client knows whether they may post a listing.
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId)
    .select(`${ME_FIELDS} lastSeenAt`)
    .lean();

  if (!user) throw ApiError.unauthorized('User not found.');

  touchLastSeen(user._id.toString(), user.lastSeenAt);

  res.status(200).json({ success: true, data: serializeMe(user) });
});

/**
 * How stale `lastSeenAt` may get before `getMe` refreshes it. The profile's
 * online dot only needs minute-level accuracy, so writing on every single
 * `/auth/me` call (the client makes one per page load) would be pure waste.
 */
const ONLINE_TOUCH_MS = 2 * 60 * 1000;

/** Fire-and-forget presence write — never blocks or fails the request. */
function touchLastSeen(userId: string, lastSeenAt?: Date): void {
  if (lastSeenAt && Date.now() - lastSeenAt.getTime() < ONLINE_TOUCH_MS) return;
  void User.updateOne({ _id: userId }, { $set: { lastSeenAt: new Date() } }).catch(() => {
    // Presence is cosmetic — a failed write must not surface to the caller.
  });
}

/**
 * PATCH /api/auth/me
 * Updates name/email/password/primaryDirection — each field optional, only
 * what's sent changes. Setting `newPassword` requires `currentPassword` to
 * verify (enforced by `updateMeSchema`'s refine, re-checked here against the
 * hash). `primaryDirection` is purely the candidate's own "who am I" pick —
 * it doesn't need to be a direction they've actually tested yet.
 */
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const body = req.body as {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
    primaryDirection?: Direction | null;
    username?: string;
    skills?: string[];
    socials?: SocialLinks;
  } & Record<string, unknown>;
  const { name, email, currentPassword, newPassword, primaryDirection, username } = body;

  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('User not found.');

  if (email && email !== user.email) {
    const exists = await User.findOne({ email });
    if (exists) throw ApiError.conflict('Email already registered.');
    user.email = email;
  }

  if (username && username !== user.username) {
    const exists = await User.findOne({ username });
    if (exists) throw ApiError.conflict('Username already taken.');
    user.username = username;
  }

  if (name) user.name = name;

  if (primaryDirection !== undefined) {
    user.primaryDirection = primaryDirection ?? undefined;
  }

  applyProfileFields(user, body);

  if (newPassword) {
    if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
      throw ApiError.unauthorized('Current password is incorrect.');
    }
    user.passwordHash = hashPassword(newPassword);
  }

  await user.save();

  res.status(200).json({ success: true, data: serializeMe(user) });
});

/** Simple text/link profile fields — an empty string clears the field. */
const PROFILE_TEXT_FIELDS = [
  'avatarUrl',
  'coverUrl',
  'specialization',
  'about',
  'country',
  'language',
  'timezone',
] as const;

/** The subset of the above whose old value may be a file on our own disk. */
const IMAGE_FIELDS = new Set<string>(['avatarUrl', 'coverUrl']);

/**
 * Copies the freelancer-profile part of a `PATCH /auth/me` body onto the
 * document. Absent keys are left alone; an empty string clears the field so
 * the profile stops rendering it (the same contract `userSchemas.linkField`
 * validates against).
 */
function applyProfileFields(user: IUser, body: Record<string, unknown>): void {
  for (const field of PROFILE_TEXT_FIELDS) {
    const value = body[field];
    if (value === undefined) continue;
    const previous = user[field];
    user[field] = value === '' ? undefined : (value as string);
    // Replacing or clearing an image drops the file it used to point at, so
    // the upload directory doesn't accumulate orphans every time someone
    // swaps their avatar. No-ops for external URLs and for unchanged values.
    if (previous && previous !== value && IMAGE_FIELDS.has(field)) {
      void deleteImage(previous);
    }
  }

  if (Array.isArray(body.skills)) {
    // De-duplicated case-insensitively, but the user's own casing is kept
    // ("Next.js", not "next.js").
    const seen = new Set<string>();
    user.skills = (body.skills as string[]).filter((s) => {
      const key = s.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (body.socials && typeof body.socials === 'object') {
    const incoming = body.socials as SocialLinks;
    for (const platform of SOCIAL_PLATFORMS) {
      const value = incoming[platform];
      if (value === undefined) continue;
      // Per-path `set` rather than replacing `user.socials` wholesale:
      // `socials` is a nested subdocument, so spreading it copies Mongoose
      // internals instead of the link fields. Setting a path to `undefined`
      // unsets it, which is what an empty string means here.
      user.set(`socials.${platform}`, value === '' ? undefined : value);
    }
  }
}

/**
 * DELETE /api/auth/me
 * Password-confirmed self-deletion. Cascades to everything that would
 * otherwise be orphaned: posted listings, test sessions, refresh tokens,
 * portfolio items and reviews (both received and written).
 * (Question/Job documents from OTHER users are obviously untouched.)
 */
export const deleteMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { password } = req.body as { password: string };

  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('User not found.');
  if (!verifyPassword(password, user.passwordHash)) {
    throw ApiError.unauthorized('Incorrect password.');
  }

  // Collect the files this account owns BEFORE the documents pointing at
  // them are gone, otherwise the uploads are stranded on disk forever.
  const ownedImages = [
    user.avatarUrl,
    user.coverUrl,
    ...(await PortfolioItem.find({ userId: user._id }).select('imageUrl').lean()).map(
      (item) => item.imageUrl,
    ),
  ];

  await Promise.all([
    Job.deleteMany({ postedBy: user._id }),
    Session.deleteMany({ userId: user._id }),
    RefreshToken.deleteMany({ userId: user._id }),
    PortfolioItem.deleteMany({ userId: user._id }),
    // Both directions: the reviews on their profile AND the ones they wrote
    // elsewhere (which would otherwise keep showing a deleted author).
    Review.deleteMany({ $or: [{ targetUserId: user._id }, { authorId: user._id }] }),
  ]);
  await user.deleteOne();
  await Promise.all(ownedImages.map((image) => deleteImage(image)));

  res.status(200).json({ success: true, data: { deleted: true } });
});
