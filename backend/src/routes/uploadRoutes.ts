import { Router } from 'express';
import { uploadImage, parseImageUpload } from '@/controllers/uploadController';
import { authenticate } from '@/middleware/authenticate';
import { uploadRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

// Authenticated + rate-limited: writing files to disk is the one endpoint an
// abusive client can use to consume a finite resource, so it gets a tighter
// budget than the global limiter provides.
router.post('/image', authenticate, uploadRateLimiter, parseImageUpload, uploadImage);

export default router;
