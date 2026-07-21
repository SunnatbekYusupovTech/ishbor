import { z } from 'zod';
import { JOB_LEVELS, JOB_STACKS, LISTING_TYPES } from '@/models/Job';

export const listJobsSchema = z.object({
  query: z.object({
    type: z.enum(LISTING_TYPES as [string, ...string[]]).optional(),
    level: z.enum(JOB_LEVELS as [string, ...string[]]).optional(),
    stack: z.enum(JOB_STACKS as [string, ...string[]]).optional(),
    keyword: z.string().max(100).optional(),
    location: z.string().max(100).optional(),
    salaryMin: z.coerce.number().min(0).optional(),
    salaryMax: z.coerce.number().min(0).optional(),
    sort: z.enum(['newest', 'oldest', 'salary_asc', 'salary_desc']).optional(),
  }),
});

export const createJobSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(120),
    // Required for vacancies; validated per-role in the controller.
    company: z.string().trim().max(120).optional(),
    description: z.string().trim().min(10).max(4000),
    stack: z.enum(JOB_STACKS as [string, ...string[]]),
    // Employer supplies the required level; a seeker's level comes from their badge.
    level: z.enum(JOB_LEVELS as [string, ...string[]]).optional(),
    location: z.string().trim().max(100).optional(),
    salary: z.string().trim().max(60).optional(),
    contactPhone: z.string().trim().max(40).optional(),
    contactTelegram: z.string().trim().max(60).optional(),
  }),
});
