import { Router } from 'express';
import { register, login, refreshAuthToken, logout, logoutAll } from '@/controllers/authController';
import { getMe, updateMe, deleteMe } from '@/controllers/userController';
import { authenticate } from '@/middleware/authenticate';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { validate } from '@/middleware/validate';
import { updateMeSchema, deleteMeSchema } from '@/validation/userSchemas';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/refresh', authRateLimiter, refreshAuthToken);
router.post('/logout', logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, validate(updateMeSchema), updateMe);
router.delete('/me', authenticate, validate(deleteMeSchema), deleteMe);

export default router;
