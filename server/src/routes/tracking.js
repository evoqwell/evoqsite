import { Router } from 'express';
import { PageView } from '../models/PageView.js';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter: 30 requests per minute per IP
const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true
});

const trackSchema = z.object({
  page: z.enum(['homepage', 'products'])
});

router.post('/', trackingLimiter, async (req, res) => {
  try {
    const { page } = trackSchema.parse(req.body);

    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || '';

    await PageView.create({
      ipAddress,
      page,
      userAgent: userAgent.substring(0, 500)
    });

    res.status(204).end();
  } catch (error) {
    // Silent fail for tracking
    console.error('[tracking] Error recording page view:', error.message);
    res.status(204).end();
  }
});

export default router;
