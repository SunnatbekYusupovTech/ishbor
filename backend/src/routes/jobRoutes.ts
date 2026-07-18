import { Router } from 'express';
import { listJobs, createJob } from '@/controllers/jobController';
import { authenticate } from '@/middleware/authenticate';
import { validate } from '@/middleware/validate';
import { listJobsSchema, createJobSchema } from '@/validation/jobSchemas';

const router = Router();

// Public — browse listings with optional level/stack filters.
router.get('/', validate(listJobsSchema), listJobs);

// Authenticated + verified — publish a listing.
router.post('/', authenticate, validate(createJobSchema), createJob);

export default router;
