import { Schema, model, type Document, type Types } from 'mongoose';
import { DIRECTIONS, type Direction } from '@/config/catalog';

/**
 * Six non-"none" tiers instead of the old four (none/junior/middle/senior) —
 * the odd counts of passed technologies (1/3/5) land on the named tier,
 * even counts (2/4/6+) land on that tier's "strong" variant. See
 * `scoringService.tierFromPassedCount` for the exact mapping.
 */
export type Tier = 'none' | 'junior' | 'strong-junior' | 'middle' | 'strong-middle' | 'senior' | 'strong-senior';
export const TIERS: Tier[] = ['none', 'junior', 'strong-junior', 'middle', 'strong-middle', 'senior', 'strong-senior'];

/** Kept as an alias so `import type { VerificationLevel }` elsewhere doesn't need renaming everywhere at once. */
export type VerificationLevel = Tier;

export type UserRole = 'employer' | 'seeker' | 'admin';

export const USER_ROLES: UserRole[] = ['employer', 'seeker', 'admin'];

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  /** 'employer' posts vacancies; 'seeker' posts a resume after passing the test. */
  role: UserRole;
  /**
   * One tier per direction — passing "frontend" doesn't imply anything
   * about "backend". `startTest` records which direction a session was for
   * (`Session.direction`); `finalizeSession` upgrades only that direction's
   * entry (never downgrades, same rule as before, just scoped per-key).
   */
  verificationLevels: Record<Direction, Tier>;
  /**
   * The candidate's own pick of "who they are" — shown as their primary
   * badge (leaderboard, job posts) when set. Purely a self-description; it
   * does not gate or unlock anything and is edited via `PATCH /auth/me`.
   */
  primaryDirection?: Direction;
  /** Best test result the user has ever achieved — powers the leaderboard. */
  bestPercentage: number;
  bestScore: number;
  attempts: number;
  /** IP the account registered from — powers the per-IP signup limit (see `authController.register`). */
  registrationIp?: string;
  /**
   * QA/anti-cheat testing account — never settable through public registration
   * (only via `seed.ts` or a direct DB edit). `startTest` exempts it from the
   * cooldown gate and the one-in-progress-session guard (abandons the old
   * session instead of rejecting), and it unlocks `POST /test/auto-complete`
   * so a tester can instantly finish with a perfect score to inspect the
   * result flow (badge, ResultCard, ...) in each locale without playing
   * through 5 real questions every time.
   */
  isQaTester: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      default: 'seeker',
      index: true,
    },
    verificationLevels: {
      type: Schema.Types.Mixed,
      default: () => Object.fromEntries(DIRECTIONS.map((d) => [d, 'none'])),
    },
    primaryDirection: { type: String, enum: DIRECTIONS },
    bestPercentage: { type: Number, default: 0, min: 0, max: 100, index: true },
    bestScore: { type: Number, default: 0, min: 0 },
    attempts: { type: Number, default: 0, min: 0 },
    registrationIp: { type: String, index: true },
    isQaTester: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const User = model<IUser>('User', userSchema);
