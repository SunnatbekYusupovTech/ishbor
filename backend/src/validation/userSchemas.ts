import { z } from 'zod';
import { DIRECTIONS } from '@/config/catalog';
import { SOCIAL_PLATFORMS } from '@/models/User';
import { INTERNAL_UPLOAD_RE } from '@/services/imageStorage';

/**
 * A public profile handle: lowercase letters, digits and underscores only.
 * Kept URL-safe on purpose — it is the `/u/<username>` path segment.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters.')
  .max(30)
  .regex(/^[a-z0-9_]+$/, 'Username may contain only lowercase letters, digits and underscores.');

/**
 * Links are stored as full URLs so the profile can render them as-is.
 * An empty string is meaningful: it CLEARS the link (the field disappears
 * from the profile), which is why `.url()` is unioned with `literal('')`
 * instead of just being optional.
 */
const linkField = (max = 300) =>
  z.union([z.string().trim().url().max(max), z.literal('')]).optional();

/** Same "empty string clears it" contract as `linkField`, for plain text. */
const textField = (max: number) => z.string().trim().max(max).optional();

/**
 * An image reference: either an external URL the user pasted, or an internal
 * `/uploads/<uuid>.<ext>` path produced by `POST /uploads/image`.
 *
 * The internal branch is matched against `INTERNAL_UPLOAD_RE` rather than a
 * loose `startsWith('/uploads/')` so a client can't store a traversal string
 * (`/uploads/../../etc/passwd`) that later gets turned back into a
 * filesystem path by `deleteImage`.
 */
const imageRefField = (max = 500) =>
  z
    .union([
      z.string().trim().regex(INTERNAL_UPLOAD_RE, 'Invalid uploaded image reference.'),
      z.string().trim().url().max(max),
      z.literal(''),
    ])
    .optional();

const socialsShape = Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p, linkField()])) as Record<
  (typeof SOCIAL_PLATFORMS)[number],
  ReturnType<typeof linkField>
>;

export const socialsSchema = z.object(socialsShape);

/**
 * Enforced on REGISTER and on setting a NEW password via `PATCH /auth/me`.
 * Login intentionally accepts any non-empty string (see `authController`'s
 * `loginSchema`) — tightening the policy later must never lock out users who
 * registered under an older, looser rule, and echoing policy requirements
 * back on a failed login would leak information to an attacker probing for
 * valid accounts.
 */
export const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128)
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a symbol.');

/**
 * All fields optional — the candidate submits only what they're changing.
 * `currentPassword` is required whenever `newPassword` is present (checked
 * by the refine below); it is never required just to change name/email,
 * matching how most account-settings forms behave.
 */
export const updateMeSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(100).optional(),
      email: z.string().trim().toLowerCase().email().optional(),
      currentPassword: z.string().min(1).max(128).optional(),
      newPassword: passwordPolicy.optional(),
      /** The candidate's own "who am I" pick — `null` clears it. */
      primaryDirection: z.enum(DIRECTIONS as [string, ...string[]]).nullable().optional(),

      // --- Public freelancer profile (see `models/User.ts`) ---
      username: usernameSchema.optional(),
      avatarUrl: imageRefField(),
      coverUrl: imageRefField(),
      specialization: textField(80),
      /** Replaces the whole tag list — the client always sends the full array. */
      skills: z.array(z.string().trim().min(1).max(30)).max(40).optional(),
      about: textField(1500),
      socials: socialsSchema.optional(),
      country: textField(60),
      language: textField(80),
      timezone: textField(60),
    })
    // `Object.keys` rather than an explicit list: the profile fields above
    // would otherwise have to be repeated here (and silently forgotten by
    // the next one added).
    .refine((b) => Object.keys(b).length > 0, {
      message: 'Provide at least one field to update.',
    })
    .refine((b) => !b.newPassword || !!b.currentPassword, {
      message: 'currentPassword is required to set a new password.',
      path: ['currentPassword'],
    }),
});

export const deleteMeSchema = z.object({
  body: z.object({
    password: z.string().min(1).max(128),
  }),
});

/* ------------------------- Portfolio & reviews ------------------------- */

export const createPortfolioItemSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(120),
    category: textField(60),
    description: textField(600),
    imageUrl: imageRefField(),
    link: linkField(500),
  }),
});

/** Same fields, all optional — a partial edit of one existing work. */
export const updatePortfolioItemSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).max(120).optional(),
      category: textField(60),
      description: textField(600),
      imageUrl: imageRefField(),
      link: linkField(500),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: 'Provide at least one field to update.',
    }),
});

export const createReviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    text: z.string().trim().min(1).max(1000),
  }),
});
