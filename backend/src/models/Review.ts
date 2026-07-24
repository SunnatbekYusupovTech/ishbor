import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * A review left on someone's public freelancer profile.
 *
 * One review per (target, author) pair — enforced by the compound unique
 * index below, so posting again edits the existing review instead of letting
 * a single account stack up ratings on the same profile.
 */
export interface IReview extends Document {
  _id: Types.ObjectId;
  /** Whose profile the review appears on. */
  targetUserId: Types.ObjectId;
  authorId: Types.ObjectId;
  /** Denormalised so listing reviews needs no populate (same trick as `Job.postedByName`). */
  authorName: string;
  /** Author avatar at write time — `null`/absent falls back to initials. */
  authorAvatarUrl?: string;
  /** 1–5 stars. */
  rating: number;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName: { type: String, required: true, trim: true },
    authorAvatarUrl: { type: String, trim: true, maxlength: 500 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

reviewSchema.index({ targetUserId: 1, authorId: 1 }, { unique: true });

export const Review = model<IReview>('Review', reviewSchema);
