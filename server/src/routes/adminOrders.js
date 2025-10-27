import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import { Order } from '../models/Order.js';
import { z } from 'zod';
import { centsToDollars } from '../utils/money.js';

const router = Router();

router.use(requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.json({
      orders: orders.map((order) => ({
        orderNumber: order.orderNumber,
        status: order.status,
        promoCode: order.promoCode || null,
        venmoNote: order.venmoNote,
        totals: {
          subtotal: centsToDollars(order.totals.subtotalCents),
          discount: centsToDollars(order.totals.discountCents),
          shipping: centsToDollars(order.totals.shippingCents),
          total: centsToDollars(order.totals.totalCents)
        },
        items: order.items.map((item) => ({
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          price: centsToDollars(item.priceCents),
          lineTotal: centsToDollars(item.lineTotalCents)
        })),
        customer: order.customer,
        createdAt: order.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

const statusSchema = z.object({
  status: z.enum(['pending_payment', 'paid', 'fulfilled', 'cancelled'])
});

router.patch('/:orderNumber/status', async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const { orderNumber } = req.params;

    const order = await Order.findOneAndUpdate(
      { orderNumber },
      { $set: { status } },
      { new: true }
    ).lean();

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json({
      orderNumber: order.orderNumber,
      status: order.status
    });
  } catch (error) {
    next(error);
  }
});

export default router;
