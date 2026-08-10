import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * A 1:1 chat thread between two users (the live chat + request system — a
 * job application auto-creates its conversation, see `models/Application.ts`).
 *
 * The two participants are stored as `userA`/`userB` ALWAYS sorted by id
 * (lexicographic), which is what makes the unique `(userA, userB)` pair index
 * possible — the same two people can never have two threads, whichever of
 * them started it. Use `orderedParticipantPair()` below to build the pair.
 */
export interface IConversation extends Document {
  _id: Types.ObjectId;
  /** Lower id of the pair — see the doc comment above. */
  userA: Types.ObjectId;
  /** Higher id of the pair. */
  userB: Types.ObjectId;
  /** When the thread was opened from a job listing (vacancy/resume). */
  jobId?: Types.ObjectId;
  /** When the thread was auto-created by a job application request. */
  applicationId?: Types.ObjectId;
  /** Denormalised time of the newest message — powers inbox sorting. */
  lastMessageAt: Date;
  createdAt: Date;
}

/** `userA` < `userB` by string comparison — the canonical pair ordering. */
export function orderedParticipantPair(a: string | Types.ObjectId, b: string | Types.ObjectId) {
  const [x, y] = [a.toString(), b.toString()].sort();
  return { userA: x, userB: y };
}

export function isParticipant(conversation: { userA: Types.ObjectId; userB: Types.ObjectId }, userId: string): boolean {
  return conversation.userA.toString() === userId || conversation.userB.toString() === userId;
}

/** The other participant's id, given one of them. */
export function otherParticipant(conversation: { userA: Types.ObjectId; userB: Types.ObjectId }, userId: string): string {
  return conversation.userA.toString() === userId
    ? conversation.userB.toString()
    : conversation.userA.toString();
}

const conversationSchema = new Schema<IConversation>(
  {
    userA: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userB: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application' },
    lastMessageAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One thread per unordered pair of users.
conversationSchema.index({ userA: 1, userB: 1 }, { unique: true });

export const Conversation = model<IConversation>('Conversation', conversationSchema);
