import { Router } from 'express';
import { verifyWebhookSecret } from '@/middleware/verifyWebhookSecret';
import { validate } from '@/middleware/validate';
import { importQuestionsSchema } from '@/validation/webhookSchemas';
import { importQuestions } from '@/controllers/webhookController';

const router = Router();

router.post('/questions', verifyWebhookSecret, validate(importQuestionsSchema), importQuestions);

export default router;
