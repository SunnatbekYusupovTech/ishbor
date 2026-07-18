import type { Request, Response } from 'express';
import { Job, type JobLevel, type JobStack, type ListingType } from '@/models/Job';
import { User, type IUser } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';
import { logger } from '@/utils/logger';

/**
 * GET /api/jobs?type=&level=&stack=
 * PUBLIC — browse listings. `type` selects vacancies (employer) or resumes
 * (job seekers); `level`/`stack` filter within either.
 */
export const listJobs = asyncHandler(async (req: Request, res: Response) => {
  const { type, level, stack } = req.query as {
    type?: ListingType;
    level?: JobLevel;
    stack?: JobStack;
  };

  const filter: Record<string, unknown> = {};
  if (type) filter.type = type;
  if (level) filter.level = level;
  if (stack) filter.stack = stack;

  const jobs = await Job.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    // Pull the author's reputation so cards/details can show a rating without
    // an extra round-trip. `postedBy` may be null for legacy rows.
    .populate<{ postedBy: Pick<IUser, 'role' | 'verificationLevel' | 'bestPercentage' | 'bestScore' | 'attempts' | 'createdAt'> | null }>(
      'postedBy',
      'role verificationLevel bestPercentage bestScore attempts createdAt',
    )
    .lean();

  res.status(200).json({
    success: true,
    data: jobs.map((j) => {
      const author = j.postedBy;
      return {
        id: j._id.toString(),
        type: j.type,
        title: j.title,
        company: j.company ?? null,
        description: j.description,
        level: j.level,
        stack: j.stack,
        salary: j.salary ?? null,
        contactPhone: j.contactPhone ?? null,
        contactTelegram: j.contactTelegram ?? null,
        postedByName: j.postedByName,
        postedByRole: author?.role ?? (j.type === 'resume' ? 'seeker' : 'employer'),
        createdAt: j.createdAt,
        // Author reputation (drives the star rating on the UI). Employers have
        // no test score, so this is most meaningful for resumes.
        rating: author
          ? {
              verificationLevel: author.verificationLevel,
              bestPercentage: author.bestPercentage,
              bestScore: author.bestScore,
              attempts: author.attempts,
              memberSince: author.createdAt,
            }
          : null,
      };
    }),
  });
});

/**
 * POST /api/jobs
 * AUTHENTICATED. The listing type is derived from the user's role:
 *   - employer → publishes a VACANCY (company required, no test needed)
 *   - seeker   → publishes a RESUME (must be verified; level = their badge)
 */
export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized('User not found.');

  const { title, company, description, stack, level, salary, contactPhone, contactTelegram } =
    req.body as {
      title: string;
      company?: string;
      description: string;
      stack: JobStack;
      level?: JobLevel;
      salary?: string;
      contactPhone?: string;
      contactTelegram?: string;
    };

  let type: ListingType;
  let resolvedLevel: JobLevel;
  let resolvedCompany: string | undefined;

  if (user.role === 'employer') {
    type = 'vacancy';
    if (!company || company.trim().length < 2) {
      throw ApiError.badRequest('Company is required for a vacancy.');
    }
    if (!level) {
      throw ApiError.badRequest('Level is required for a vacancy.');
    }
    resolvedLevel = level;
    resolvedCompany = company.trim();
  } else {
    // seeker → resume
    type = 'resume';
    if (user.verificationLevel === 'none') {
      throw ApiError.forbidden('You must pass the skill assessment before posting a resume.');
    }
    // A seeker's advertised level is their earned verification badge.
    resolvedLevel = user.verificationLevel as JobLevel;
    resolvedCompany = undefined;
  }

  const job = await Job.create({
    type,
    title,
    company: resolvedCompany,
    description,
    level: resolvedLevel,
    stack,
    salary,
    contactPhone,
    contactTelegram,
    postedBy: user._id,
    postedByName: user.name,
  });

  logger.info(`${type} ${job._id} posted by ${user.email} (${user.role})`);

  res.status(201).json({
    success: true,
    data: { id: job._id.toString(), type },
  });
});
