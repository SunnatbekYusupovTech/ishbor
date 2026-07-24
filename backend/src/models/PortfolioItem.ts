import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * One piece of work on a freelancer's public profile. Deliberately its own
 * collection rather than an array on `User`: the spec allows an unbounded
 * number of items, and an ever-growing embedded array would be paid for on
 * every single `User` read (login, leaderboard, job list, ...).
 */
export interface IPortfolioItem extends Document {
  _id: Types.ObjectId;
  /** Owner — the only one allowed to edit or delete the item. */
  userId: Types.ObjectId;
  title: string;
  /** Free-text grouping ("Landing", "Mobile app", "Showreel"), shown as a chip. */
  category?: string;
  description?: string;
  /** Preview image URL (no upload pipeline in this deployment — users paste links). */
  imageUrl?: string;
  /** Optional "view the live work" link. */
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const portfolioItemSchema = new Schema<IPortfolioItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 600 },
    imageUrl: { type: String, trim: true, maxlength: 500 },
    link: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

export const PortfolioItem = model<IPortfolioItem>('PortfolioItem', portfolioItemSchema);
