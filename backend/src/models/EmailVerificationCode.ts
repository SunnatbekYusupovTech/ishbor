import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * A registration-verification OTP — same shape/reasoning as `PasswordResetCode`:
 * never stored in plaintext, one row per outstanding code (a new
 * `register`/`resendVerification` call deletes any previous rows first), TTL
 * index sweeps expired ones automatically.
 */
export interface IEmailVerificationCode extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  codeHash: string;
  expiresAt: Date;
  /** Wrong-code guesses against this row; hits `MAX_RESET_ATTEMPTS`-equivalent → dead, request a new code. */
  attempts: number;
  createdAt: Date;
}

const emailVerificationCodeSchema = new Schema<IEmailVerificationCode>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

emailVerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailVerificationCode = model<IEmailVerificationCode>(
  'EmailVerificationCode',
  emailVerificationCodeSchema,
);
