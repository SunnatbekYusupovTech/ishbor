import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Application, type IApplication } from '@/models/Application';
import { Job, type JobStack } from '@/models/Job';
import { User, ONLINE_WINDOW_MS } from '@/models/User';
import { PortfolioItem } from '@/models/PortfolioItem';
import { Review } from '@/models/Review';
import { Message } from '@/models/Message';
import { findOrCreateConversation } from '@/controllers/chatController';
import { publicSocials, serializePortfolioItem } from '@/controllers/profileController';
import { applySchema, updateApplicationSchema } from '@/validation/chatSchemas';
import { getChatIO } from '@/sockets/chatSocket';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';

/**
 * Job applications ("requests"). One system with the live chat: applying
 * auto-creates the seeker↔employer conversation and the request's cover
 * message doubles as its first message. The employer's applicants view
 * (`listJobApplications`) renders the seeker's FULL profile form — every
 * field the public `/u/<handle>` page shows — so a request arrives with the
 * candidate's whole picture, not just a name.
 */

/** The full public-profile fields needed to render the "full form" card. */
const SEEKER_CARD_FIELDS =
  'name username avatarUrl coverUrl specialization skills about socials country language timezone ' +
  'verificationLevels primaryDirection bestPercentage bestScore attempts createdAt lastSeenAt';

function isOnline(user: { lastSeenAt?: Date | null }): boolean {
  return !!user.lastSeenAt && Date.now() - user.lastSeenAt.getTime() < ONLINE_WINDOW_MS;
}

/** The job's primary stack — first of `stacks`, falling back to the legacy field. */
function primaryStack(job: { stacks?: JobStack[]; stack?: JobStack }): JobStack {
  return (job.stacks && job.stacks.length ? job.stacks[0] : (job.stack ?? 'frontend')) as JobStack;
}

/** Builds the FULL profile form attached to each application for the employer. */
export function buildSeekerCard(
  user: {
    _id: Types.ObjectId;
    name: string;
    username?: string;
    avatarUrl?: string;
    coverUrl?: string;
    specialization?: string;
    skills?: string[];
    about?: string;
    socials?: Record<string, unknown>;
    country?: string;
    language?: string;
    timezone?: string;
    verificationLevels: Record<string, string>;
    primaryDirection?: string;
    bestPercentage?: number;
    bestScore?: number;
    attempts?: number;
    createdAt: Date;
    lastSeenAt?: Date;
  },
  portfolio: Array<{
    _id: Types.ObjectId;
    title: string;
    category?: string;
    description?: string;
    imageUrl?: string;
    link?: string;
    createdAt: Date;
  }>,
  reviewSummary?: { count: number; average: number },
) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username ?? null,
    avatarUrl: user.avatarUrl ?? null,
    coverUrl: user.coverUrl ?? null,
    specialization: user.specialization ?? null,
    skills: user.skills ?? [],
    about: user.about ?? null,
    socials: publicSocials(user.socials),
    country: user.country ?? null,
    language: user.language ?? null,
    timezone: user.timezone ?? null,
    memberSince: user.createdAt,
    isOnline: isOnline(user),
    verificationLevels: user.verificationLevels,
    primaryDirection: user.primaryDirection ?? null,
    bestPercentage: user.bestPercentage ?? 0,
    bestScore: user.bestScore ?? 0,
    attempts: user.attempts ?? 0,
    // The full form includes the candidate's portfolio + review reputation.
    portfolio: portfolio.map(serializePortfolioItem),
    reviewCount: reviewSummary?.count ?? 0,
    reviewAverage: reviewSummary?.average ?? 0,
    handle: user.username ?? user._id.toString(),
  };
}

type AppLike = Pick<
  IApplication,
  '_id' | 'jobId' | 'seekerId' | 'employerId' | 'message' | 'status' | 'conversationId' | 'seenByEmployer' | 'createdAt'
>;

function serializeApplication(app: AppLike) {
  return {
    id: app._id.toString(),
    jobId: app.jobId.toString(),
    seekerId: app.seekerId.toString(),
    employerId: app.employerId.toString(),
    message: app.message ?? null,
    status: app.status,
    conversationId: app.conversationId.toString(),
    seenByEmployer: app.seenByEmployer,
    createdAt: app.createdAt,
  };
}

/**
 * POST /api/jobs/:id/apply  { message? }
 * AUTHENTICATED (seeker) — the request itself. One per seeker per vacancy.
 * Creates the application AND the seeker↔employer conversation in one go; the
 * cover message (or a default line) becomes the thread's first message, and
 * the employer gets a live `chat:application` event.
 */
export const applyToJob = asyncHandler(async (req: Request, res: Response) => {
  const seekerId = req.user!.userId;
  const { message } = applySchema.parse({ body: req.body }).body;

  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound('Job not found.');
  if (job.type !== 'vacancy') {
    throw ApiError.badRequest('You can only send a request for a vacancy.');
  }
  if (job.postedBy.toString() === seekerId) {
    throw ApiError.forbidden('You cannot send a request for your own listing.');
  }

  const existing = await Application.findOne({ jobId: job._id, seekerId });
  if (existing) throw ApiError.conflict('You have already sent a request for this vacancy.');

  const employerId = job.postedBy.toString();
  const conversation = await findOrCreateConversation(seekerId, employerId, job._id.toString());

  let app: IApplication;
  try {
    app = await Application.create({
      jobId: job._id,
      seekerId,
      employerId,
      message: message || undefined,
      status: 'pending',
      conversationId: conversation._id,
      seenByEmployer: false,
    });
  } catch (err) {
    // The (jobId, seekerId) unique index catches a double-submit racing past
    // the `findOne` above — surface it as the same 409 the normal path uses,
    // not a raw duplicate-key 500.
    if ((err as { code?: number })?.code === 11000) {
      throw ApiError.conflict('You have already sent a request for this vacancy.');
    }
    throw err;
  }

  conversation.applicationId = app._id;
  await conversation.save();

  // The request doubles as the first message of the thread.
  const firstText = message?.trim() || 'Ariza yuborildi';
  const msg = await Message.create({
    conversationId: conversation._id,
    senderId: seekerId,
    text: firstText,
    readBy: [seekerId],
  });
  conversation.lastMessageAt = msg.createdAt;
  await conversation.save();

  const io = getChatIO();
  io?.to(`user:${employerId}`).emit('chat:application', {
    applicationId: app._id.toString(),
    jobId: job._id.toString(),
    jobTitle: job.title,
    seekerId,
  });
  io?.to(`user:${employerId}`).emit('chat:message', {
    conversationId: conversation._id.toString(),
    message: {
      id: msg._id.toString(),
      conversationId: conversation._id.toString(),
      senderId: seekerId,
      text: msg.text,
      readBy: [seekerId],
      createdAt: msg.createdAt,
    },
  });

  res.status(201).json({
    success: true,
    data: { application: serializeApplication(app), conversationId: conversation._id.toString() },
  });
});

/**
 * GET /api/jobs/:id/applications
 * AUTHENTICATED (the vacancy's employer only) — every request for one vacancy,
 * each with the seeker's FULL profile form attached (`buildSeekerCard`).
 * Reading this view marks all requests as seen (drives the employer's badge).
 */
export const listJobApplications = asyncHandler(async (req: Request, res: Response) => {
  const employerId = req.user!.userId;
  const job = await Job.findById(req.params.id).lean();
  if (!job) throw ApiError.notFound('Job not found.');
  if (job.postedBy.toString() !== employerId) {
    throw ApiError.forbidden('Only the employer of this vacancy can view its requests.');
  }

  const applications = await Application.find({ jobId: job._id }).sort({ createdAt: -1 }).lean();
  await Application.updateMany({ jobId: job._id, seenByEmployer: false }, { $set: { seenByEmployer: true } });

  const seekerIds = [...new Set(applications.map((a) => a.seekerId))];
  const [seekers, portfolio, reviewAgg] = await Promise.all([
    User.find({ _id: { $in: seekerIds } }).select(SEEKER_CARD_FIELDS).lean(),
    PortfolioItem.find({ userId: { $in: seekerIds } }).sort({ createdAt: -1 }).lean(),
    Review.aggregate<{ _id: Types.ObjectId; avg: number; count: number }>([
      { $match: { targetUserId: { $in: seekerIds } } },
      { $group: { _id: '$targetUserId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]).exec(),
  ]);

  const seekerById = new Map(seekers.map((u) => [u._id.toString(), u]));
  const portfolioByUser = new Map<string, typeof portfolio>();
  for (const item of portfolio) {
    const key = item.userId.toString();
    const list = portfolioByUser.get(key) ?? [];
    list.push(item);
    portfolioByUser.set(key, list);
  }
  const reviewByUser = new Map(reviewAgg.map((r) => [r._id.toString(), r]));

  res.status(200).json({
    success: true,
    data: {
      job: {
        id: job._id.toString(),
        title: job.title,
        level: job.level,
        stack: primaryStack(job),
        salary: job.salary ?? null,
        location: job.location ?? null,
      },
      applications: applications.map((a) => {
        const seeker = seekerById.get(a.seekerId.toString());
        const review = reviewByUser.get(a.seekerId.toString());
        return {
          ...serializeApplication(a),
          // The full form — null only if the seeker's account was deleted.
          seeker: seeker
            ? buildSeekerCard(
                seeker,
                portfolioByUser.get(a.seekerId.toString()) ?? [],
                review ? { count: review.count, average: review.avg } : undefined,
              )
            : null,
        };
      }),
    },
  });
});

/**
 * GET /api/me/applications
 * AUTHENTICATED (seeker) — the requests I sent: job + employer snippets and
 * the live status, so the seeker can track accept/reject without digging.
 */
export const listMyApplications = asyncHandler(async (req: Request, res: Response) => {
  const seekerId = req.user!.userId;
  const applications = await Application.find({ seekerId }).sort({ createdAt: -1 }).limit(100).lean();

  if (applications.length === 0) {
    res.status(200).json({ success: true, data: [] });
    return;
  }

  const jobIds = [...new Set(applications.map((a) => a.jobId))];
  const employerIds = [...new Set(applications.map((a) => a.employerId))];

  const [jobs, employers] = await Promise.all([
    Job.find({ _id: { $in: jobIds } }).select('title company stacks stack level salary location').lean(),
    User.find({ _id: { $in: employerIds } }).select('name username avatarUrl specialization').lean(),
  ]);

  const jobById = new Map(jobs.map((j) => [j._id.toString(), j]));
  const employerById = new Map(employers.map((u) => [u._id.toString(), u]));

  res.status(200).json({
    success: true,
    data: applications.map((a) => {
      const job = jobById.get(a.jobId.toString());
      const employer = employerById.get(a.employerId.toString());
      return {
        id: a._id.toString(),
        status: a.status,
        message: a.message ?? null,
        conversationId: a.conversationId.toString(),
        createdAt: a.createdAt,
        job: job
          ? {
              id: job._id.toString(),
              title: job.title,
              company: job.company ?? null,
              stack: primaryStack(job),
              level: job.level,
              salary: job.salary ?? null,
              location: job.location ?? null,
            }
          : null,
        employer: employer
          ? {
              id: employer._id.toString(),
              name: employer.name,
              username: employer.username ?? null,
              avatarUrl: employer.avatarUrl ?? null,
              specialization: employer.specialization ?? null,
            }
          : null,
      };
    }),
  });
});

/**
 * PATCH /api/applications/:id  { status }
 * AUTHENTICATED (the vacancy's employer only) — accept or reject a request.
 * The seeker is notified live (`chat:application-updated`), and the request's
 * thread carries the status through the shared `applicationId` link.
 */
export const updateApplication = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { status } = updateApplicationSchema.parse({ body: req.body }).body;

  const app = await Application.findById(req.params.id);
  if (!app) throw ApiError.notFound('Application not found.');

  const job = await Job.findById(app.jobId).lean();
  if (!job || job.postedBy.toString() !== userId) {
    throw ApiError.forbidden('Only the employer of this vacancy can update its requests.');
  }

  app.status = status;
  await app.save();

  getChatIO()?.to(`user:${app.seekerId.toString()}`).emit('chat:application-updated', {
    applicationId: app._id.toString(),
    jobId: job._id.toString(),
    jobTitle: job.title,
    status: app.status,
  });

  res.status(200).json({ success: true, data: { id: app._id.toString(), status: app.status } });
});
