import { Schema, model, type Document, type Types } from 'mongoose';

export const REPORT_REASONS = [
  'spam',
  'inappropriate',
  'incorrect-salary',
  'fake',
];
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ['open', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/**
 * A user's complaint about a vacancy. Created from the "More" menu's
 * "Report the vacancy" action (the reporter picks a reason). Stored in its
 * own collection so moderators (admin panel) can review them later — the
 * listing itself is never touched by a report.
 */
export interface IJobReport extends Document {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  /** The user who filed the report. */
  reporterId: Types.ObjectId;
  /** Denormalised snapshot so the report stays readable after author changes. */
  jobTitle?: string;
  company?: string;
  reason: ReportReason;
  note?: string;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
}

const jobReportSchema = new Schema<IJobReport>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jobTitle: { type: String, trim: true, maxlength: 120 },
    company: { type: String, trim: true, maxlength: 120 },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    note: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: REPORT_STATUSES, default: 'open', index: true },
  },
  { timestamps: true },
);

export const JobReport = model<IJobReport>('JobReport', jobReportSchema);
