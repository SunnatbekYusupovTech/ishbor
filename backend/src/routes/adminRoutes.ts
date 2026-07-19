import { Router } from 'express';
import { getViolations } from '@/controllers/adminController';
import { authenticate } from '@/middleware/authenticate';
import { requireAdmin } from '@/middleware/requireAdmin';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/violations', getViolations);

export default router;
