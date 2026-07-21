import { Schema, model, type Document, type Types } from 'mongoose';

export type JobLevel = 'junior' | 'middle' | 'senior';
export type JobStack = 'frontend' | 'backend' | 'fullstack' | 'mobile';
/** 'vacancy' = posted by an employer; 'resume' = posted by a job seeker. */
export type ListingType = 'vacancy' | 'resume';

export const JOB_LEVELS: JobLevel[] = ['junior', 'middle', 'senior'];
export const JOB_STACKS: JobStack[] = ['frontend', 'backend', 'fullstack', 'mobile'];
export const LISTING_TYPES: ListingType[] = ['vacancy', 'resume'];

export interface IJob extends Document {
  _id: Types.ObjectId;
  type: ListingType;
  title: string;
  /** Company name — only for vacancies. */
  company?: string;
  description: string;
  level: JobLevel;
  stack: JobStack;
  salary?: string;
  /** Numeric salary bounds extracted from the display string — used for range filtering. */
  salaryMin?: number;
  salaryMax?: number;
  /** Job location (city / remote / hybrid). */
  location?: string;
  contactPhone?: string;
  contactTelegram?: string;
  /** The user who posted this listing. */
  postedBy: Types.ObjectId;
  /** Denormalised author name so the list endpoint needs no populate. */
  postedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    type: { type: String, enum: LISTING_TYPES, required: true, default: 'vacancy', index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    company: { type: String, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    level: {
      type: String,
      enum: JOB_LEVELS,
      required: true,
      index: true,
    },
    stack: {
      type: String,
      enum: JOB_STACKS,
      required: true,
      index: true,
    },
    salary: { type: String, trim: true, maxlength: 60 },
    salaryMin: { type: Number, min: 0 },
    salaryMax: { type: Number, min: 0 },
    location: { type: String, trim: true, maxlength: 100 },
    contactPhone: { type: String, trim: true, maxlength: 40 },
    contactTelegram: { type: String, trim: true, maxlength: 60 },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postedByName: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export const Job = model<IJob>('Job', jobSchema);
