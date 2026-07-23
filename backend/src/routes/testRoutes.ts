import { Router } from 'express';
import {
  getCatalog,
  startTest,
  submitTest,
  autoCompleteTest,
  recordTabSwitch,
  recordViolation,
  getSession,
} from '@/controllers/testController';
import { authenticate } from '@/middleware/authenticate';
import { validate } from '@/middleware/validate';
import { testRateLimiter } from '@/middleware/rateLimiter';
import {
  startTestSchema,
  submitTestSchema,
  autoCompleteTestSchema,
  tabSwitchSchema,
  violationSchema,
} from '@/validation/testSchemas';

const router = Router();

// Public — taxonomy for the technology picker.
router.get('/catalog', getCatalog);

// Every other assessment route requires a valid candidate token.
router.use(authenticate);

router.post('/start', testRateLimiter, validate(startTestSchema), startTest);
router.post('/submit', testRateLimiter, validate(submitTestSchema), submitTest);
// QA-tester only (checked inside the controller) — instantly finishes a
// session with a perfect score so the anti-cheat flow can be exercised
// repeatedly without answering real questions every time.
router.post('/auto-complete', validate(autoCompleteTestSchema), autoCompleteTest);
router.post('/tab-switch', validate(tabSwitchSchema), recordTabSwitch);
router.post('/violation', validate(violationSchema), recordViolation);
router.get('/session/:sessionId', getSession);

export default router;
