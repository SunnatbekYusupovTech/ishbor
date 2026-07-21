import { Router } from 'express';
import { register, login, refreshAuthToken, logout, logoutAll } from '@/controllers/authController';
import { getMe } from '@/controllers/userController';
import { authenticate } from '@/middleware/authenticate';
import { authRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/refresh', authRateLimiter, refreshAuthToken);
router.post('/logout', logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, getMe);

export default router;
