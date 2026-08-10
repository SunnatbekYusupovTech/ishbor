import { Router } from 'express';
import {
  listConversations,
  getMessages,
  sendMessage,
  markRead,
  startConversation,
} from '@/controllers/chatController';
import { authenticate } from '@/middleware/authenticate';
import { validate } from '@/middleware/validate';
import { sendMessageSchema, startConversationSchema } from '@/validation/chatSchemas';

const router = Router();

// Everything here is authenticated — there is no public chat surface.
router.get('/conversations', authenticate, listConversations);
router.post(
  '/conversations',
  authenticate,
  validate(startConversationSchema),
  startConversation,
);
router.get('/conversations/:id/messages', authenticate, getMessages);
router.post(
  '/conversations/:id/messages',
  authenticate,
  validate(sendMessageSchema),
  sendMessage,
);
router.post('/conversations/:id/read', authenticate, markRead);

export default router;
