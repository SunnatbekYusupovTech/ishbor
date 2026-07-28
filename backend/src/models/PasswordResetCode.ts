import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * A password-reset OTP is never stored in plaintext — only its SHA-256 hash
 * (`utils/otp.ts#hashResetCode`), same reasoning as `RefreshToken`: a stolen
 * DB dump alone can't be used to reset anyone's password. One row per
 * outstanding code; `forgotPassword` deletes any previous rows for the user
 * before creating a new one, so at most one code is ever valid at a time.
 */
export interface IPasswordResetCode extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  codeHash: string;
  expiresAt: Date;
  /** Wrong-code guesses against this row; hits `MAX_RESET_ATTEMPTS` → dead, request a new code. */
  attempts: number;
  createdAt: Date;
}

const passwordResetCodeSchema = new Schema<IPasswordResetCode>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Mongo TTL monitor sweeps expired rows automatically — no manual cleanup job.
passwordResetCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetCode = model<IPasswordResetCode>(
  'PasswordResetCode',
  passwordResetCodeSchema,
);
