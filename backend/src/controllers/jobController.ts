import type { Request, Response } from 'express';
import { Job, type JobLevel, type JobStack, type ListingType } from '@/models/Job';
import { User, type IUser } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';
import { logger } from '@/utils/logger';

/** Collapses a 6-tier `Tier` down to the 3-value `JobLevel` a resume post
 *  carries (drops the "strong-" prefix); `'none'` has no equivalent post. */
function tierToJobLevel(tier: string): JobLevel | null {
  if (tier === 'none') return null;
  return tier.replace(/^strong-/, '') as JobLevel;
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

  const filter: Record<string, unknown> = {};
  if (type) filter.type = type;
  if (level) filter.level = level;
  if (stack) filter.stack = stack;

  // Full-text keyword search across title, company, description, postedByName.
  if (keyword?.trim()) {
    const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = { $regex: escaped, $options: 'i' };
    filter.$or = [
      { title: regex },
      { company: regex },
      { description: regex },
      { postedByName: regex },
    ];
  }

  // Location filter (case-insensitive partial match).
  if (location?.trim()) {
    filter.location = { $regex: location.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  // Salary range filter.
  if (salaryMin || salaryMax) {
    const salaryFilter: Record<string, number> = {};
    if (salaryMin) salaryFilter.$lte = Number(salaryMin);
    if (salaryMax) salaryFilter.$gte = Number(salaryMax);
    // We want listings whose salary range overlaps with the requested range:
    // salaryMin <= requestedMax AND salaryMax >= requestedMin
    const salaryOr = [
      { salaryMin: { $lte: salaryMax ? Number(salaryMax) : Infinity } },
      { salaryMax: { $gte: salaryMin ? Number(salaryMin) : 0 } },
    ];

    if (filter.$or) {
      // Combine with existing $or (keyword/location) using $and (AND semantics).
      const existingOr = filter.$or;
      delete filter.$or;
      filter.$and = [
        { $or: existingOr as unknown[] },
        { $or: salaryOr },
      ];
    } else {
      filter.$or = salaryOr;
    }
  }

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
      return {
        id: j._id.toString(),
        type: j.type,
        title: j.title,
        company: j.company ?? null,
        description: j.description,
        level: j.level,
        stack: j.stack,
        salary: j.salary ?? null,
        location: j.location ?? null,
        contactPhone: j.contactPhone ?? null,
        contactTelegram: j.contactTelegram ?? null,
        postedByName: j.postedByName,
        postedByRole: author?.role ?? (j.type === 'resume' ? 'seeker' : 'employer'),
        createdAt: j.createdAt,
        // The badge shown next to a listing is the author's tier for THIS
        // job's own stack — a frontend job shows their frontend badge, etc.
        rating: author
          ? {
              verificationLevel: author.verificationLevels?.[j.stack] ?? 'none',
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

  const { title, company, description, stack, level, salary, location, contactPhone, contactTelegram } =
    req.body as {
      title: string;
      company?: string;
      description: string;
      stack: JobStack;
      level?: JobLevel;
      salary?: string;
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
    // A seeker's advertised level is their earned badge for THIS stack —
    // passing a frontend test doesn't unlock posting a backend resume.
    const stackTier = user.verificationLevels?.[stack] ?? 'none';
    const jobLevel = tierToJobLevel(stackTier);
    if (!jobLevel) {
      throw ApiError.forbidden(
        `You must pass the ${stack} skill assessment before posting a resume for it.`,
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
    stack,
    salary,
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
