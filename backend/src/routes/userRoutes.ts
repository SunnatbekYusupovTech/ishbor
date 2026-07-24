import { Router } from 'express';
import { getLeaderboard } from '@/controllers/userController';
import {
  getPublicProfile,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  createReview,
  deleteReview,
} from '@/controllers/profileController';
import { authenticate } from '@/middleware/authenticate';
import { optionalAuthenticate } from '@/middleware/optionalAuthenticate';
import { validate } from '@/middleware/validate';
import {
  createPortfolioItemSchema,
  updatePortfolioItemSchema,
  createReviewSchema,
} from '@/validation/userSchemas';

const router = Router();

// Public leaderboard — ranked by best assessment result.
router.get('/leaderboard', getLeaderboard);

// --- Own portfolio / reviews (declared before `/profile/:handle` isn't
// strictly needed — the paths don't overlap — but keeps the owner-scoped
// group visually together). ---
router.post('/me/portfolio', authenticate, validate(createPortfolioItemSchema), createPortfolioItem);
router.patch(
  '/me/portfolio/:id',
  authenticate,
  validate(updatePortfolioItemSchema),
  updatePortfolioItem,
);
router.delete('/me/portfolio/:id', authenticate, deletePortfolioItem);
router.delete('/me/reviews/:id', authenticate, deleteReview);

// --- Public freelancer profile. `optionalAuthenticate` so the response can
// carry `isOwner`/`isMine` flags without ever rejecting an anonymous read. ---
router.get('/profile/:handle', optionalAuthenticate, getPublicProfile);
router.post('/profile/:handle/reviews', authenticate, validate(createReviewSchema), createReview);

export default router;
