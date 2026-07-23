import { Schema, model, type Document, type Types } from 'mongoose';

export type VerificationLevel = 'none' | 'junior' | 'middle' | 'senior';
/**
 * `admin` is deliberately NOT selectable through public registration
 * (`authController.ts`'s `registerSchema` only allows `employer`/`seeker`) —
 * it can only be granted by editing the database directly (or a future
 * admin-only user-management endpoint). Never trust a role from user input.
 */
export type UserRole = 'employer' | 'seeker' | 'admin';

export const USER_ROLES: UserRole[] = ['employer', 'seeker', 'admin'];

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  /** 'employer' posts vacancies; 'seeker' posts a resume after passing the test. */
  role: UserRole;
  verificationLevel: VerificationLevel;
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
    verificationLevel: {
      type: String,
      enum: ['none', 'junior', 'middle', 'senior'],
      default: 'none',
    },
    bestPercentage: { type: Number, default: 0, min: 0, max: 100, index: true },
    bestScore: { type: Number, default: 0, min: 0 },
    attempts: { type: Number, default: 0, min: 0 },
    registrationIp: { type: String, index: true },
    isQaTester: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const User = model<IUser>('User', userSchema);
