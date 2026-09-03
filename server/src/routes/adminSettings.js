import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../middleware/adminAuth.js';
import {
  getStorefrontSettings,
  updateStorefrontSettings
} from '../services/storefrontSettings.js';

const router = Router();

router.use(requireAdmin);

const updateSettingsSchema = z
  .object({
    cardPaymentsEnabled: z.boolean()
  })
  .strict();

router.get('/', async (req, res, next) => {
  try {
    const settings = await getStorefrontSettings();
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

router.patch('/', async (req, res, next) => {
  try {
    const payload = updateSettingsSchema.parse(req.body);
    const settings = await updateStorefrontSettings(payload);
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

export default router;
