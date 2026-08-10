import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * A job application ("request"): a seeker sends it to a vacancy's employer,
 * and it doubles as the first message of the auto-created `Conversation`
 * between them — the request and the live chat are one system (see
 * `applicationController.applyToJob`). The employer's applicants view renders
 * the seeker's FULL profile form (skills, verification levels, portfolio,
 * reviews, ...) next to each request — that form is assembled server-side in
 * `applicationController` from `User`/`PortfolioItem`/`Review`.
 */
export const APPLICATION_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface IApplication extends Document {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  seekerId: Types.ObjectId;
  employerId: Types.ObjectId;
  /** Short cover note the seeker attached to the request (also the first chat message). */
  message?: string;
  status: ApplicationStatus;
  /** The thread auto-created for this request — chat and request are one system. */
  conversationId: Types.ObjectId;
  /** False until the employer opens the applicants list — drives the unread "requests" badge. */
  seenByEmployer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    seekerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'pending', index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    seenByEmployer: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One request per seeker per vacancy.
applicationSchema.index({ jobId: 1, seekerId: 1 }, { unique: true });

export const Application = model<IApplication>('Application', applicationSchema);
