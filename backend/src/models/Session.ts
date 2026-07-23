import { Schema, model, type Document, type Types } from 'mongoose';
import type { Tier } from '@/models/User';
import { DIRECTIONS, type Direction } from '@/config/catalog';

export type SessionStatus =
  | 'in-progress'
  | 'submitted'
  | 'expired'
  | 'terminated'; // killed by anti-cheat (disconnect / too many tab switches)

export interface ISessionAnswer {
  questionId: Types.ObjectId;
  userAnswer: number; // index the candidate selected
}

/**
 * Per-question option permutation for this session. `order[displayedIndex]`
 * yields the ORIGINAL option index. This lets us shuffle options per candidate
 * (so answer positions can't be memorised/shared) while still scoring against
 * the canonical `correctAnswer` on the server.
 */
export interface IOptionOrder {
  questionId: Types.ObjectId;
  order: number[];
}

export interface ISession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** Which direction this attempt was for — `finalizeSession` upgrades only
   *  `User.verificationLevels[direction]`, never any other direction's tier. */
  direction: Direction;
  /** Snapshot of the question ids served for this session (prevents tampering). */
  questionIds: Types.ObjectId[];
  /** Per-question shuffled option order (display -> original index). */
  optionOrders: IOptionOrder[];
  answers: ISessionAnswer[];
  status: SessionStatus;
  startTime: Date;
  /** Absolute server-side deadline; used to reject late submissions. */
  deadline: Date;
  endTime?: Date;

  // Anti-cheat telemetry
  tabSwitchCount: number;
  /** Non-tab-switch integrity violations: copy/paste, right-click, devtools, etc. */
  violationCount: number;
  terminationReason?: string;
  /** Client IP captured at `POST /test/start` — never shown to the candidate. */
  startIp?: string;
  /**
   * `POST /test/submit` came from a different IP than `startIp`. Informational
   * only (mobile networks legitimately rotate IPs) — surfaced to admins for
   * manual review, never blocks scoring.
   */
  ipMismatch?: boolean;
  /**
   * The full attempt finished faster than a human plausibly could
   * (`totalTime < questions.length * MIN_SECONDS_PER_QUESTION`). Informational
   * only, same as `ipMismatch` — flags a likely scripted/automated submission
   * for admin review without blocking the candidate's result.
   */
  suspiciouslyFast?: boolean;

  // Result (populated only after scoring)
  score?: number; // raw weighted points earned
  maxScore?: number; // maximum attainable weighted points
  percentage?: number;
  awardedLevel?: Tier;

  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema<ISessionAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    userAnswer: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const optionOrderSchema = new Schema<IOptionOrder>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    order: { type: [Number], required: true },
  },
  { _id: false },
);

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    direction: { type: String, enum: DIRECTIONS, required: true },
    questionIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Question',
      required: true,
    },
    optionOrders: { type: [optionOrderSchema], default: [] },
    answers: { type: [answerSchema], default: [] },
    status: {
      type: String,
      enum: ['in-progress', 'submitted', 'expired', 'terminated'],
      default: 'in-progress',
      index: true,
    },
    startTime: { type: Date, required: true, default: Date.now },
    deadline: { type: Date, required: true },
    endTime: { type: Date },

    tabSwitchCount: { type: Number, default: 0, min: 0 },
    violationCount: { type: Number, default: 0, min: 0 },
    terminationReason: { type: String },
    startIp: { type: String },
    ipMismatch: { type: Boolean },
    suspiciouslyFast: { type: Boolean },

    score: { type: Number, min: 0 },
    maxScore: { type: Number, min: 0 },
    percentage: { type: Number, min: 0, max: 100 },
    awardedLevel: {
      type: String,
      enum: ['none', 'junior', 'strong-junior', 'middle', 'strong-middle', 'senior', 'strong-senior'],
    },
  },
  { timestamps: true },
);

/** A user should only ever have one active session at a time. */
sessionSchema.index(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'in-progress' } },
);

export const Session = model<ISession>('Session', sessionSchema);
