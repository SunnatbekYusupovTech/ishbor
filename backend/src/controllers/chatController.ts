import type { Request, Response } from 'express';
import { Types } from 'mongoose';import { Conversation,
  isParticipant,
  otherParticipant,
  orderedParticipantPair,
  type IConversation,
} from '@/models/Conversation';
import { Message, type IMessage } from '@/models/Message';
import { User, ONLINE_WINDOW_MS } from '@/models/User';
import { Job } from '@/models/Job';
import { Application } from '@/models/Application';
import { sendMessageSchema, startConversationSchema } from '@/validation/chatSchemas';
import { getChatIO } from '@/sockets/chatSocket';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';

/** Fields every participant snippet carries (avatar, name, handle, headline...). */
const SNIPPET_FIELDS = 'name username avatarUrl specialization role lastSeenAt';

function isOnline(user: { lastSeenAt?: Date | null }): boolean {
  return !!user.lastSeenAt && Date.now() - user.lastSeenAt.getTime() < ONLINE_WINDOW_MS;
}

type MessageLike = Pick<IMessage, '_id' | 'conversationId' | 'senderId' | 'text' | 'readBy' | 'createdAt'>;
type ConvoLike = Pick<IConversation, '_id' | 'userA' | 'userB' | 'jobId' | 'applicationId' | 'lastMessageAt'>;

function serializeMessage(msg: MessageLike) {
  return {
    id: msg._id.toString(),
    conversationId: msg.conversationId.toString(),
    senderId: msg.senderId.toString(),
    text: msg.text,
    readBy: msg.readBy.map((id) => id.toString()),
    createdAt: msg.createdAt,
  };
}

function serializeConversation(
  convo: ConvoLike,
  userId: string,
  other: { _id: Types.ObjectId; name: string; username?: string; avatarUrl?: string; specialization?: string; role?: string; lastSeenAt?: Date },
  lastMessage: MessageLike | null,
  unreadCount: number,
  job: { _id: Types.ObjectId; title: string; type: string } | null,
  application: { _id: Types.ObjectId; status: string } | null,
) {
  return {
    id: convo._id.toString(),
    jobId: convo.jobId ? convo.jobId.toString() : null,
    applicationId: convo.applicationId ? convo.applicationId.toString() : null,
    application: application ? { id: application._id.toString(), status: application.status } : null,
    job: job ? { id: job._id.toString(), title: job.title, type: job.type } : null,
    lastMessageAt: convo.lastMessageAt,
    other: {
      id: other._id.toString(),
      name: other.name,
      username: other.username ?? null,
      avatarUrl: other.avatarUrl ?? null,
      specialization: other.specialization ?? null,
      role: other.role ?? 'seeker',
      isOnline: isOnline(other),
    },
    lastMessage: lastMessage ? { id: lastMessage._id.toString(), text: lastMessage.text, senderId: lastMessage.senderId.toString(), createdAt: lastMessage.createdAt } : null,
    unreadCount,
    meId: userId,
  };
}

/** Finds the existing thread between two users or creates it (idempotent). */
export async function findOrCreateConversation(
  a: string,
  b: string,
  jobId?: string,
): Promise<IConversation> {
  const { userA, userB } = orderedParticipantPair(a, b);
  let convo = await Conversation.findOne({ userA, userB });
  if (!convo) {
    try {
      convo = await Conversation.create({
        userA,
        userB,
        ...(jobId && Types.ObjectId.isValid(jobId) ? { jobId } : {}),
      });
    } catch (err) {
      // Two requests racing to open the same thread: the unique (userA, userB)
      // index lets exactly one create win; the loser refetches the winner's row
      // instead of 500ing on a duplicate key.
      if ((err as { code?: number })?.code === 11000) {
        convo = await Conversation.findOne({ userA, userB });
        if (convo) return convo;
      }
      throw err;
    }
    const io = getChatIO();
    io?.to(`user:${b}`).emit('chat:conversation', { conversationId: convo._id.toString() });
  }
  return convo;
}

/**
 * GET /api/chat/conversations
 * AUTHENTICATED — the inbox: newest-first threads with the other participant's
 * snippet, the last message and the unread count for the viewer.
 */
export const listConversations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const convos = await Conversation.find({ $or: [{ userA: userId }, { userB: userId }] })
    .sort({ lastMessageAt: -1 })
    .limit(100)
    .lean();

  if (convos.length === 0) {
    res.status(200).json({ success: true, data: [] });
    return;
  }

  const participantIds = [...new Set(convos.flatMap((c) => [c.userA.toString(), c.userB.toString()]))];
  const jobIds = [...new Set(convos.map((c) => c.jobId?.toString()).filter((x): x is string => !!x))];

  const applicationIds = [...new Set(convos.map((c) => c.applicationId?.toString()).filter((x): x is string => !!x))];

  const [participants, jobs, lastMessages, unreadCounts, applications] = await Promise.all([
    User.find({ _id: { $in: participantIds } }).select(SNIPPET_FIELDS).lean(),
    jobIds.length ? Job.find({ _id: { $in: jobIds } }).select('title type').lean() : Promise.resolve([]),
    Promise.all(convos.map((c) => Message.findOne({ conversationId: c._id }).sort({ createdAt: -1 }).lean())),
    Promise.all(convos.map((c) => Message.countDocuments({ conversationId: c._id, readBy: { $ne: userId } }))),
    applicationIds.length
      ? Application.find({ _id: { $in: applicationIds } }).select('status').lean()
      : Promise.resolve([]),
  ]);

  const userById = new Map(participants.map((u) => [u._id.toString(), u]));
  const jobById = new Map(jobs.map((j) => [j._id.toString(), j]));
  const applicationById = new Map(applications.map((a) => [a._id.toString(), a]));

  res.status(200).json({
    success: true,
    data: convos.map((c, i) =>
      serializeConversation(
        c,
        userId,
        userById.get(otherParticipant(c, userId))!,
        lastMessages[i],
        unreadCounts[i],
        c.jobId ? (jobById.get(c.jobId.toString()) ?? null) : null,
        c.applicationId ? (applicationById.get(c.applicationId.toString()) ?? null) : null,
      ),
    ),
  });
});

/**
 * GET /api/chat/conversations/:id/messages?before=&limit=
 * AUTHENTICATED (participant only) — newest-first page of messages, returned
 * ascending so the client can append directly.
 */
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const convo = await Conversation.findById(req.params.id).lean();
  if (!convo || !isParticipant(convo, userId)) {
    throw ApiError.notFound('Conversation not found.');
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const before = typeof req.query.before === 'string' ? new Date(req.query.before) : undefined;
  const query: Record<string, unknown> = { conversationId: convo._id };
  if (before && !Number.isNaN(before.getTime())) query.createdAt = { $lt: before };

  const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit).lean();

  res.status(200).json({
    success: true,
    data: {
      messages: messages.reverse().map(serializeMessage),
      hasMore: messages.length === limit,
    },
  });
});

/**
 * POST /api/chat/conversations/:id/messages
 * AUTHENTICATED (participant only) — persists the message, bumps the thread's
 * `lastMessageAt` and pushes it live to the other participant (and to this
 * conversation's room, which the sender's own other tabs may have open).
 */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { text } = sendMessageSchema.parse({ body: req.body }).body;

  const convo = await Conversation.findById(req.params.id);
  if (!convo || !isParticipant(convo, userId)) {
    throw ApiError.notFound('Conversation not found.');
  }

  const msg = await Message.create({
    conversationId: convo._id,
    senderId: userId,
    text,
    readBy: [userId],
  });

  convo.lastMessageAt = msg.createdAt;
  await convo.save();

  const serialized = serializeMessage(msg);
  const payload = { conversationId: convo._id.toString(), message: serialized };

  // Emit ONLY to the other participant's `user:` room — every chat client
  // joins `user:<id>` on connect, so this reaches them whether or not the
  // thread is open. (The `conversation:` rooms exist for future scoping, but
  // emitting to both would double-deliver to a recipient viewing the thread.)
  const io = getChatIO();
  io?.to(`user:${otherParticipant(convo, userId)}`).emit('chat:message', payload);

  res.status(201).json({ success: true, data: serialized });
});

/**
 * POST /api/chat/conversations/:id/read
 * AUTHENTICATED (participant only) — marks every message the viewer hasn't
 * seen as read and tells the other participant so their read receipts update
 * live.
 */
export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const convo = await Conversation.findById(req.params.id).lean();
  if (!convo || !isParticipant(convo, userId)) {
    throw ApiError.notFound('Conversation not found.');
  }

  await Message.updateMany(
    { conversationId: convo._id, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } },
  );

  getChatIO()?.to(`user:${otherParticipant(convo, userId)}`).emit('chat:read', {
    conversationId: convo._id.toString(),
    byUserId: userId,
  });

  res.status(200).json({ success: true, data: { read: true } });
});

/**
 * POST /api/chat/conversations  { userId, jobId? }
 * AUTHENTICATED — opens a thread with another user (idempotent: the same pair
 * always shares one thread). Used by \"message\" buttons on listings and
 * profiles; job applications create their thread via `applyToJob` instead.
 */
export const startConversation = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { userId: otherId, jobId } = startConversationSchema.parse({ body: req.body }).body;

  if (otherId === userId) {
    throw ApiError.badRequest('You cannot start a conversation with yourself.');
  }

  const other = await User.findById(otherId).select('_id');
  if (!other) throw ApiError.notFound('User not found.');

  const convo = await findOrCreateConversation(userId, otherId, jobId);

  res.status(200).json({ success: true, data: { id: convo._id.toString() } });
});
