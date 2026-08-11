import { Schema, model, type Document, type Types } from 'mongoose';

export type Difficulty = 'junior' | 'middle' | 'senior';

/** Points awarded per correct answer, keyed by difficulty (weighted scoring). */
export const DIFFICULTY_WEIGHTS: Record<Difficulty, number> = {
  junior: 1,
  middle: 2,
  senior: 3,
};

/** A single localised rendering of a question (text + options in canonical order). */
export interface LocalizedContent {
  text: string;
  options: string[];
}

export interface IQuestion extends Document {
  _id: Types.ObjectId;
  type: 'multiple-choice' | 'open-ended';
  /**
   * Stable content key (`<technology>-<n>`) used to pair a question with its
   * translations and to keep localisation reproducible across re-seeds.
   */
  key?: string;
  text: string;
  options: string[];
  /** Used for AI-evaluation of open-ended questions. Hidden from client. */
  idealAnswer?: string;
  /**
   * Localised content by locale (e.g. `{ ru: {...}, uz: {...} }`). English lives
   * in `text`/`options` (the canonical scoring reference). `options` in every
   * locale are in the SAME order as the canonical options, so the option shuffle
   * and index-based scoring stay language-agnostic.
   */
  translations?: Record<string, LocalizedContent>;
  /**
   * Index into `options` of the correct choice.
   * SECURITY: `select: false` keeps this out of every query result by default,
   * so it is NEVER serialised to the client. It is only loaded explicitly on the
   * server during scoring via `.select('+correctAnswer')`.
   */
  correctAnswer: number;
  difficulty: Difficulty;
  /** Technology pool this question belongs to (e.g. 'react', 'nodejs', 'swift'). */
  technology: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    type: { type: String, enum: ['multiple-choice', 'open-ended'], default: 'multiple-choice' },
    key: { type: String, index: true },
    translations: { type: Schema.Types.Mixed },
    text: { type: String, required: true, trim: true },
    options: {
      type: [String],
      validate: {
        validator: function (this: IQuestion, opts: string[]) {
          if (this.type === 'open-ended') return true;
          return opts && opts.length >= 2 && opts.length <= 6;
        },
        message: 'A multiple-choice question must have between 2 and 6 options.',
      },
    },
    idealAnswer: { type: String, select: false },
    correctAnswer: {
      type: Number,
      select: false, // hidden index — never leaves the server
      validate: {
        validator: function (this: IQuestion, value: number) {
          if (this.type === 'open-ended') return true;
          return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < (this.options?.length || 0);
        },
        message: 'correctAnswer must be a valid index into options.',
      },
    },
    difficulty: {
      type: String,
      enum: ['junior', 'middle', 'senior'],
      required: true,
      index: true,
    },
    technology: {
      type: String,
      required: true,
      index: true,
    },
    category: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true },
);

/**
 * Defensive serialisation: even if a document is accidentally fetched with
 * `+correctAnswer`, strip it before it can ever be sent as JSON.
 */
questionSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete (ret as { correctAnswer?: unknown }).correctAnswer;
    return ret;
  },
});

export const Question = model<IQuestion>('Question', questionSchema);
