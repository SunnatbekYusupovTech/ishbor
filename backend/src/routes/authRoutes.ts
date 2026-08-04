import { Router } from 'express';
import {
  register,
  login,
  googleAuthStart,
  googleAuthCallback,
  refreshAuthToken,
  logout,
  logoutAll,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  verifyEmail,
  resendVerification,
} from '@/controllers/authController';
import { getMe, updateMe, deleteMe } from '@/controllers/userController';
import { authenticate } from '@/middleware/authenticate';
import {
  authRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter,
} from '@/middleware/rateLimiter';
import { validate } from '@/middleware/validate';
import { updateMeSchema, deleteMeSchema } from '@/validation/userSchemas';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.get('/google', authRateLimiter, googleAuthStart);
router.get('/google/callback', authRateLimiter, googleAuthCallback);
router.post('/refresh', authRateLimiter, refreshAuthToken);
router.post('/logout', logout);
router.post('/logout-all', authenticate, logoutAll);
router.post('/forgot-password', passwordResetRateLimiter, forgotPassword);
router.post('/verify-reset-code', passwordResetRateLimiter, verifyResetCode);
router.post('/reset-password', passwordResetRateLimiter, resetPassword);
router.post('/verify-email', emailVerificationRateLimiter, verifyEmail);
router.post('/resend-verification', emailVerificationRateLimiter, resendVerification);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, validate(updateMeSchema), updateMe);
router.delete('/me', authenticate, validate(deleteMeSchema), deleteMe);

export default router;
