import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * One chat message inside a `Conversation`. `readBy` holds the ids of the
 * participants who have seen the message (the sender is always in it — you've
 * read what you wrote); a recipient missing from the array is the definition
 * of "unread", and the count drives the inbox badges.
 */
export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  text: string;
  /** Ids of participants who have seen this message. */
  readBy: Types.ObjectId[];
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Inbox pagination reads newest-first per conversation.
messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = model<IMessage>('Message', messageSchema);
