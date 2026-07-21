import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * A refresh token is never stored in plaintext — only its SHA-256 hash
 * (`utils/jwt.ts#hashRefreshToken`). The raw token is a high-entropy random
 * string handed to the client once; it is not a JWT, so it carries no claims
 * and cannot be "decoded" — its only power is looking up this row.
 */
export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  /** Set when rotated (used to mint a new token) or explicitly logged out. */
  revokedAt?: Date;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Mongo TTL monitor sweeps expired rows automatically — no manual cleanup job.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
