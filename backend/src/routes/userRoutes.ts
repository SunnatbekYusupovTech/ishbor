import { Router } from 'express';
import { getLeaderboard } from '@/controllers/userController';

const router = Router();

// Public leaderboard — ranked by best assessment result.
router.get('/leaderboard', getLeaderboard);

export default router;
