import { Router } from 'express';
import { PromoCode } from '../models/PromoCode.js';

const router = Router();

router.get('/:code', async (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ error: 'Promo code is required.' });
    }

    const promo = await PromoCode.findOne({ code, isActive: true }).lean();
    if (!promo) {
      return res.status(404).json({ error: 'Promo code not found.' });
    }

    res.json({
      promo: {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        description: promo.description
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
