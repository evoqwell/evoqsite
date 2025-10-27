import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import { PromoCode } from '../models/PromoCode.js';
import { z } from 'zod';

const router = Router();

router.use(requireAdmin);

const promoSchema = z.object({
  code: z.string().trim().min(1).transform((val) => val.toUpperCase()),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().nonnegative(),
  description: z.string().trim().optional().default(''),
  isActive: z.boolean().optional().default(true)
});

const updateSchema = promoSchema.partial();

router.get('/', async (req, res, next) => {
  try {
    const promos = await PromoCode.find().sort({ code: 1 }).lean();
    res.json({
      promos: promos.map((promo) => ({
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        description: promo.description,
        isActive: promo.isActive
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = promoSchema.parse(req.body);
    const existing = await PromoCode.findOne({ code: payload.code });
    if (existing) {
      return res.status(409).json({ error: 'Promo code already exists.' });
    }

    const promo = await PromoCode.create(payload);
    res.status(201).json({
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      description: promo.description,
      isActive: promo.isActive
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:code', async (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const payload = updateSchema.parse(req.body);
    const update = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        update[key] = value;
      }
    }

    if (update.code) {
      update.code = update.code.toUpperCase();
    }

    const promo = await PromoCode.findOneAndUpdate(
      { code },
      { $set: update },
      { new: true }
    ).lean();

    if (!promo) {
      return res.status(404).json({ error: 'Promo code not found.' });
    }

    res.json({
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      description: promo.description,
      isActive: promo.isActive
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:code', async (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const result = await PromoCode.findOneAndDelete({ code });
    if (!result) {
      return res.status(404).json({ error: 'Promo code not found.' });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
