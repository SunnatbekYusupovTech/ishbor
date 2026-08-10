import { Router } from 'express';
import { listJobs, getJobById, createJob } from '@/controllers/jobController';
import { applyToJob, listJobApplications } from '@/controllers/applicationController';
import { authenticate } from '@/middleware/authenticate';
import { optionalAuthenticate } from '@/middleware/optionalAuthenticate';
import { validate } from '@/middleware/validate';
import { listJobsSchema, createJobSchema } from '@/validation/jobSchemas';
import { applySchema } from '@/validation/chatSchemas';

const router = Router();

// Public — browse listings with optional level/stack filters.
router.get('/', validate(listJobsSchema), listJobs);

// Public read, richer for the signed-in viewer (applied-by-me / own-vacancy counts).
router.get('/:id', optionalAuthenticate, getJobById);

// A seeker's request for a vacancy (auto-creates the chat thread).
router.post('/:id/apply', authenticate, validate(applySchema), applyToJob);

// The vacancy's own employer reviews the requests (each with the seeker's full form).
router.get('/:id/applications', authenticate, listJobApplications);

// Authenticated + verified — publish a listing.
router.post('/', authenticate, validate(createJobSchema), createJob);

export default router;
