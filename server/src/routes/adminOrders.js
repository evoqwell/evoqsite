import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import { Order } from '../models/Order.js';
import { z } from 'zod';
import { centsToDollars } from '../utils/money.js';
import { decryptCustomerData } from '../utils/encryption.js';
import { reserveStock, releaseStock, toStockLines } from '../utils/inventory.js';

const router = Router();

router.use(requireAdmin);

// Mirror of the range logic in adminAnalytics.js — kept inline to keep the
// change scope tight. If a third route needs this, extract to utils/dateRange.js.
function getDateRange(range) {
  const now = new Date();
  let startDate;

  switch (range) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3months':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      startDate = new Date(0);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate: now };
}

router.get('/', async (req, res, next) => {
  try {
    const { status, limit, skip } = req.query;
    const filter = {};
    if (status) {
      const statuses = String(status).split(',').filter(Boolean);
      if (statuses.length > 0) {
        filter.status = { $in: statuses };
      }
    }
    const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const parsedSkip = Math.max(Number(skip) || 0, 0);

    const [orders, total] = await Promise.all([
      Order.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: parsedSkip },
        { $limit: parsedLimit },
        {
          $project: {
            _id: 0,
            orderNumber: 1,
            status: 1,
            paymentMethod: 1,
            invoiceSentAt: 1,
            customer: {
              name: '$customer.name',
              email: '$customer.email',
            },
            totals: {
              totalCents: '$totals.totalCents',
            },
            itemsCount: { $size: { $ifNull: ['$items', []] } },
            createdAt: 1,
          },
        },
      ]),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders: orders.map((order) => ({
        orderNumber: order.orderNumber,
        status: order.status,
        paymentMethod: order.paymentMethod ?? 'venmo',
        invoiceSentAt: order.invoiceSentAt?.toISOString?.() ?? order.invoiceSentAt ?? null,
        customer: (() => {
          const decrypted = decryptCustomerData(order.customer);
          return {
            name: decrypted?.name ?? null,
            email: decrypted?.email ?? null,
          };
        })(),
        totals: {
          total: centsToDollars(order.totals.totalCents),
        },
        itemsCount: order.itemsCount ?? 0,
        createdAt: order.createdAt,
      })),
      total,
      hasMore: parsedSkip + orders.length < total,
      limit: parsedLimit,
      skip: parsedSkip,
    });
  } catch (error) {
    next(error);
  }
});

// The admin UI polls /counts on an interval, and each call is a full-collection
// $group scan. Counts change slowly, so a short cache collapses repeated polls
// into one DB round-trip without making the badge feel stale.
const COUNTS_CACHE_TTL_MS = 30_000;
let countsCache = null; // { payload, expiresAt }

// IMPORTANT: /counts and /summary literals MUST come before /:orderNumber or
// Express will match them as an orderNumber param.
router.get('/counts', async (req, res, next) => {
  try {
    if (countsCache && Date.now() < countsCache.expiresAt) {
      return res.json(countsCache.payload);
    }

    const rows = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const counts = {
      pending_payment: 0,
      paid: 0,
      fulfilled: 0,
      cancelled: 0,
    };
    for (const row of rows) {
      if (row._id in counts) counts[row._id] = row.count;
    }

    countsCache = { payload: counts, expiresAt: Date.now() + COUNTS_CACHE_TTL_MS };
    res.json(counts);
  } catch (error) {
    next(error);
  }
});

router.get('/summary', async (req, res, next) => {
  try {
    const range = req.query.range ?? 'week';
    const { startDate, endDate } = getDateRange(range);

    // Revenue = money actually received.
    // `pending_payment` = customer placed the order but hasn't Venmo'd yet, so
    // we don't count it. `cancelled` obviously doesn't count. Only `paid` and
    // `fulfilled` represent real money in.
    const result = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['paid', 'fulfilled'] },
        },
      },
      {
        $group: {
          _id: null,
          revenueCents: { $sum: '$totals.totalCents' },
          orderCount: { $sum: 1 },
        },
      },
    ]);
    const row = result[0] ?? { revenueCents: 0, orderCount: 0 };
    res.json({
      range,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      revenue: centsToDollars(row.revenueCents),
      orderCount: row.orderCount,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:orderNumber', async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber }).lean();
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      promoCode: order.promoCode || null,
      venmoNote: order.venmoNote,
      paymentMethod: order.paymentMethod ?? 'venmo',
      invoiceSentAt: order.invoiceSentAt?.toISOString?.() ?? order.invoiceSentAt ?? null,
      totals: {
        subtotal: centsToDollars(order.totals.subtotalCents),
        discount: centsToDollars(order.totals.discountCents),
        shipping: centsToDollars(order.totals.shippingCents),
        total: centsToDollars(order.totals.totalCents),
      },
      items: order.items.map((item) => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        price: centsToDollars(item.priceCents),
        lineTotal: centsToDollars(item.lineTotalCents),
      })),
      customer: decryptCustomerData(order.customer),
      createdAt: order.createdAt,
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

    // Cancelling hands the order's units back to stock. The filter on
    // `inventoryDeductedAt` is what makes it safe to run twice: only the call
    // that flips the field from set to null does the restock. Orders placed
    // before inventory tracking have no such field, so they never match.
    if (status === 'cancelled') {
      const claimed = await Order.findOneAndUpdate(
        { orderNumber, inventoryDeductedAt: { $ne: null } },
        { $set: { status, inventoryDeductedAt: null } },
        { new: true }
      ).lean();

      if (claimed) {
        await releaseStock(toStockLines(claimed.items));
        countsCache = null;
        console.log(`[orders] Restocked ${claimed.items.length} line(s) from cancelled ${orderNumber}`);
        return res.json({ orderNumber: claimed.orderNumber, status: claimed.status });
      }
      // Fell through: order is missing, or its stock was already released.
      // Either way the plain status write below is the right move.
    }

    const existing = await Order.findOne({ orderNumber }).lean();
    if (!existing) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Undoing a cancellation has to take the units back, and that can fail if
    // someone bought them in the meantime. Better to refuse the status change
    // than to quietly let stock go negative.
    if (existing.status === 'cancelled' && status !== 'cancelled' && existing.inventoryDeductedAt == null) {
      const reservation = await reserveStock(toStockLines(existing.items));

      if (!reservation.ok) {
        return res.status(409).json({
          error: `Not enough stock left to reinstate this order — ${reservation.sku} has been sold since it was cancelled. Restock that product first.`
        });
      }

      const reinstated = await Order.findOneAndUpdate(
        { orderNumber },
        { $set: { status, inventoryDeductedAt: new Date() } },
        { new: true }
      ).lean();

      countsCache = null;
      return res.json({ orderNumber: reinstated.orderNumber, status: reinstated.status });
    }

    const order = await Order.findOneAndUpdate(
      { orderNumber },
      { $set: { status } },
      { new: true }
    ).lean();

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    countsCache = null; // status moved between buckets — force fresh counts

    res.json({
      orderNumber: order.orderNumber,
      status: order.status
    });
  } catch (error) {
    next(error);
  }
});

const invoiceSentSchema = z.object({
  sent: z.boolean()
});

// Mark (or un-mark) that the card customer has been sent their invoice link.
router.patch('/:orderNumber/invoice-sent', async (req, res, next) => {
  try {
    const { sent } = invoiceSentSchema.parse(req.body);
    const { orderNumber } = req.params;

    const existing = await Order.findOne({ orderNumber }).lean();
    if (!existing) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if ((existing.paymentMethod ?? 'venmo') !== 'card') {
      return res
        .status(400)
        .json({ error: 'Only card-payment orders have an invoice to send.' });
    }

    const order = await Order.findOneAndUpdate(
      { orderNumber },
      { $set: { invoiceSentAt: sent ? new Date() : null } },
      { new: true }
    ).lean();

    res.json({
      orderNumber: order.orderNumber,
      invoiceSentAt: order.invoiceSentAt?.toISOString?.() ?? order.invoiceSentAt ?? null
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:orderNumber', async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const result = await Order.findOneAndDelete({ orderNumber });
    if (!result) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    // Deleting an order that still holds stock has to hand it back, or the
    // units vanish. An already-cancelled order has a null field and is skipped.
    if (result.inventoryDeductedAt != null) {
      await releaseStock(toStockLines(result.items));
      console.log(`[orders] Restocked ${result.items.length} line(s) from deleted ${orderNumber}`);
    }
    countsCache = null; // order removed — force fresh counts
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
