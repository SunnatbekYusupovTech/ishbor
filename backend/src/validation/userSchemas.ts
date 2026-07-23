import { z } from 'zod';
import { DIRECTIONS } from '@/config/catalog';

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
    })
    .refine(
      (b) =>
        b.name !== undefined ||
        b.email !== undefined ||
        b.newPassword !== undefined ||
        b.primaryDirection !== undefined,
      { message: 'Provide at least one field to update.' },
    )
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
