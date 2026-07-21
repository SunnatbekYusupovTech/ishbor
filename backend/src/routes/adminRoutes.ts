import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { requireAdmin } from '@/middleware/requireAdmin';
import {
  getViolations,
  getStats,
  listUsers,
  updateUser,
  deleteUser,
  listAdminJobs,
  deleteAdminJob,
  listSessions,
  listAdminQuestions,
} from '@/controllers/adminController';

const router = Router();

// All admin routes require authentication + admin role.
router.use(authenticate, requireAdmin);

// Sardor's violations endpoint
router.get('/violations', getViolations);

// Dashboard
router.get('/stats', getStats);

// Users
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Jobs
router.get('/jobs', listAdminJobs);
router.delete('/jobs/:id', deleteAdminJob);

// Sessions (anti-cheat logs)
router.get('/sessions', listSessions);

// Questions
router.get('/questions', listAdminQuestions);

export default router;
