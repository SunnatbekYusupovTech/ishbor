import { Router } from 'express';
import authRoutes from '@/routes/authRoutes';
import testRoutes from '@/routes/testRoutes';
import jobRoutes from '@/routes/jobRoutes';
import userRoutes from '@/routes/userRoutes';
import adminRoutes from '@/routes/adminRoutes';
import webhookRoutes from '@/routes/webhookRoutes';
import uploadRoutes from '@/routes/uploadRoutes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime() });
});

router.use('/auth', authRoutes);
router.use('/test', testRoutes);
router.use('/jobs', jobRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/uploads', uploadRoutes);

export default router;
