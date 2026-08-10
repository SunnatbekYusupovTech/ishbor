import { Router } from 'express';
import { listMyApplications, updateApplication } from '@/controllers/applicationController';
import { authenticate } from '@/middleware/authenticate';
import { validate } from '@/middleware/validate';
import { updateApplicationSchema } from '@/validation/chatSchemas';

const router = Router();

// The requests I (a seeker) sent.
router.get('/mine', authenticate, listMyApplications);
// The employer's decision on one request.
router.patch('/:id', authenticate, validate(updateApplicationSchema), updateApplication);

export default router;
