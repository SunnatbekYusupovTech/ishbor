import type { Request, Response } from 'express';
import { Job, type JobLevel, type JobSalaryCurrency, type JobStack, type ListingType } from '@/models/Job';
import { User, type IUser } from '@/models/User';
import { Application } from '@/models/Application';
import { JobReport } from '@/models/JobReport';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';
import { logger } from '@/utils/logger';

/** Collapses a 6-tier `Tier` down to the 3-value `JobLevel` a resume post
 *  carries (drops the "strong-" prefix); `'none'` has no equivalent post. */
function tierToJobLevel(tier: string): JobLevel | null {
  if (tier === 'none') return null;
  return tier.replace(/^strong-/, '') as JobLevel;
}

/** Ranks the 7 verification tiers so the "best" one among several can be picked. */
const TIER_RANK: Record<string, number> = {
  none: 0,
  junior: 1,
  'strong-junior': 2,
  middle: 3,
  'strong-middle': 4,
  senior: 5,
  'strong-senior': 6,
};

/** The highest-ranked tier in the list (`'none'` when nothing is verified). */
function bestTier(tiers: Array<string | undefined>): string {
  let best = 'none';
  for (const tier of tiers) {
    const rank = TIER_RANK[tier ?? 'none'] ?? 0;
    if (rank > TIER_RANK[best]) best = tier ?? 'none';
  }
  return best;
}

/** The listing's stacks — the multi-select array, falling back to the legacy single field. */
function stacksOf(job: { stacks?: JobStack[]; stack?: JobStack }): JobStack[] {
  return job.stacks && job.stacks.length ? job.stacks : [job.stack ?? 'frontend'];
}

/** Helper: parse a display-salary string like "$500 - $900" to numeric bounds. */
function parseSalaryRange(salary?: string): { salaryMin?: number; salaryMax?: number } {
  if (!salary) return {};
  // Strip currency symbols and split on common delimiters.
  const cleaned = salary.replace(/[$€£₸₩₽₮₺₴฿₫₲₵₡₢₣₤₥₦₧₨₩₪₫€₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽₾₿]/g, '').trim();
  const parts = cleaned.split(/[-–—~to]+/).map((s) => parseInt(s.replace(/[,\.\s]/g, ''), 10)).filter((n) => !isNaN(n));
  if (parts.length === 0) return {};
  return {
    salaryMin: Math.min(...parts),
    salaryMax: Math.max(...parts),
  };
}

/**
 * GET /api/jobs?type=&level=&stack=&keyword=&location=&salaryMin=&salaryMax=&sort=
 * PUBLIC — browse listings.
 */
export const listJobs = asyncHandler(async (req: Request, res: Response) => {
  const { type, level, stack, keyword, location, salaryMin, salaryMax, sort } = req.query as Record<string, string | undefined>;

  // Every clause lives in one `$and` array — safe to wrap even a single member.
  const and: Record<string, unknown>[] = [];

  if (type) and.push({ type });
  if (level) and.push({ level });

  // `stack` now carries a comma-separated list of wanted stacks. A listing
  // matches when ANY of its `stacks` overlaps the wanted set — or, for legacy
  // docs that only carry the single `stack` field, that legacy value does.
  if (stack?.trim()) {
    const wanted = stack
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (wanted.length) {
      and.push({ $or: [{ stacks: { $in: wanted } }, { stack: { $in: wanted } }] });
    }
  }

  // Full-text keyword search across title, company, description, postedByName.
  if (keyword?.trim()) {
    const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = { $regex: escaped, $options: 'i' };
    and.push({
      $or: [
        { title: regex },
        { company: regex },
        { description: regex },
        { postedByName: regex },
      ],
    });
  }

  // Location filter (case-insensitive partial match).
  if (location?.trim()) {
    and.push({ location: { $regex: location.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } });
  }

  // Salary range filter — listings whose salary range overlaps the requested
  // range: salaryMin <= requestedMax AND salaryMax >= requestedMin.
  if (salaryMin || salaryMax) {
    and.push({
      $or: [
        { salaryMin: { $lte: salaryMax ? Number(salaryMax) : Infinity } },
        { salaryMax: { $gte: salaryMin ? Number(salaryMin) : 0 } },
      ],
    });
  }

  const filter = and.length ? { $and: and } : {};

  // Sort.
  let sortOption: Record<string, 1 | -1> = { createdAt: -1 }; // newest first (default)
  if (sort === 'oldest') sortOption = { createdAt: 1 };
  else if (sort === 'salary_asc') sortOption = { salaryMin: 1 };
  else if (sort === 'salary_desc') sortOption = { salaryMin: -1, salaryMax: -1 };

  const jobs = await Job.find(filter)
    .sort(sortOption)
    .limit(200)
    .populate<{ postedBy: Pick<IUser, 'role' | 'verificationLevels' | 'bestPercentage' | 'bestScore' | 'attempts' | 'createdAt'> | null }>(
      'postedBy',
      'role verificationLevels bestPercentage bestScore attempts createdAt',
    )
    .lean();

  res.status(200).json({
    success: true,
    data: jobs.map((j) => {
      const author = j.postedBy;
      const stacks = stacksOf(j);
      return {
        id: j._id.toString(),
        type: j.type,
        title: j.title,
        company: j.company ?? null,
        description: j.description,
        level: j.level,
        stacks,
        stack: stacks[0],
        salary: j.salary ?? null,
        salaryCurrency: j.salaryCurrency ?? null,
        location: j.location ?? null,
        contactPhone: j.contactPhone ?? null,
        contactTelegram: j.contactTelegram ?? null,
        postedByName: j.postedByName,
        postedByRole: author?.role ?? (j.type === 'resume' ? 'seeker' : 'employer'),
        createdAt: j.createdAt,
        // The badge shown next to a listing is the author's BEST tier across
        // the listing's stacks — a frontend+backend job shows the higher badge.
        rating: author
          ? {
              verificationLevel: bestTier(stacks.map((s) => author.verificationLevels?.[s])),
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
 * GET /api/jobs/:id
 * PUBLIC (optionally authenticated) — the same shape `listJobs` returns, plus
 * the fields the detail dialog needs for the request/chat actions:
 * `postedById` (whose listing it is), and — when signed in — `appliedByMe` /
 * `myApplicationStatus` (did I already request this vacancy) and, for the
 * listing's own employer, `applicationCount` (how many requests arrived).
 */
export const getJobById = asyncHandler(async (req: Request, res: Response) => {
  const job = await Job.findById(req.params.id)
    .populate<{ postedBy: Pick<IUser, '_id' | 'role' | 'verificationLevels' | 'bestPercentage' | 'bestScore' | 'attempts' | 'createdAt'> | null }>(
      'postedBy',
      'role verificationLevels bestPercentage bestScore attempts createdAt',
    )
    .lean();
  if (!job) throw ApiError.notFound('Job not found.');

  const author = job.postedBy;
  const viewerId = req.user?.userId ?? null;
  const postedById = job.postedBy?._id?.toString() ?? null;
  const stacks = stacksOf(job);

  let appliedByMe = false;
  let myApplicationStatus: string | null = null;
  let myApplicationConversationId: string | null = null;
  let applicationCount = 0;
  if (viewerId) {
    const mine = await Application.findOne({ jobId: job._id, seekerId: viewerId })
      .select('status conversationId')
      .lean();
    appliedByMe = !!mine;
    myApplicationStatus = mine?.status ?? null;
    myApplicationConversationId = mine?.conversationId?.toString() ?? null;
    if (postedById === viewerId) {
      applicationCount = await Application.countDocuments({ jobId: job._id });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      id: job._id.toString(),
      type: job.type,
      title: job.title,
      company: job.company ?? null,
      description: job.description,
      level: job.level,
      stacks,
      stack: stacks[0],
      salary: job.salary ?? null,
      salaryCurrency: job.salaryCurrency ?? null,
      location: job.location ?? null,
      contactPhone: job.contactPhone ?? null,
      contactTelegram: job.contactTelegram ?? null,
      postedByName: job.postedByName,
      postedByRole: author?.role ?? (job.type === 'resume' ? 'seeker' : 'employer'),
      postedById,
      createdAt: job.createdAt,
      rating: author
        ? {
            verificationLevel: bestTier(stacks.map((s) => author.verificationLevels?.[s])),
            bestPercentage: author.bestPercentage,
            bestScore: author.bestScore,
            attempts: author.attempts,
            memberSince: author.createdAt,
          }
        : null,
      appliedByMe,
      myApplicationStatus,
      myApplicationConversationId,
      applicationCount,
    },
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

  const { title, company, description, stacks, level, salary, salaryCurrency, location, contactPhone, contactTelegram } =
    req.body as {
      title: string;
      company?: string;
      description: string;
      stacks: JobStack[];
      level?: JobLevel;
      salary?: string;
      salaryCurrency?: JobSalaryCurrency;
      location?: string;
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
    // A seeker's advertised level is their BEST earned badge across the
    // selected stacks — passing a frontend test doesn't unlock posting a
    // backend-only resume, but frontend+backend needs just one verified.
    const stackTier = bestTier(stacks.map((s) => user.verificationLevels?.[s]));
    const jobLevel = tierToJobLevel(stackTier);
    if (!jobLevel) {
      throw ApiError.forbidden(
        'You must pass the skill assessment for at least one of the selected stacks before posting a resume.',
      );
    }
    resolvedLevel = jobLevel;
    resolvedCompany = undefined;
  }

  const job = await Job.create({
    type,
    title,
    company: resolvedCompany,
    description,
    level: resolvedLevel,
    stacks,
    stack: stacks[0],
    salary,
    salaryCurrency: salary ? (salaryCurrency as JobSalaryCurrency) : undefined,
    ...parseSalaryRange(salary),
    location,
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

/**
 * POST /api/jobs/:id/report — file a complaint about a vacancy (spam / fake /
 * inappropriate / incorrect salary). The listing itself is never modified; the
 * report is stored for moderators. Idempotent-ish: a user can re-report, but a
 * new report row is created each time (no rate limit beyond auth here).
 */
export const reportJob = asyncHandler(async (req: Request, res: Response) => {
  const { reason, note } = req.body as { reason: string; note?: string };
  const job = await Job.findById(req.params.id).select('title company');
  if (!job) throw ApiError.notFound('Job not found');

  const report = await JobReport.create({
    jobId: job._id,
    reporterId: req.user!.userId,
    jobTitle: job.title,
    company: job.company,
    reason,
    note: note?.trim() || undefined,
  });

  logger.info(`Job ${job._id} reported by ${req.user!.email} (reason: ${reason})`);

  res.status(201).json({
    success: true,
    data: { id: report._id.toString() },
  });
});
