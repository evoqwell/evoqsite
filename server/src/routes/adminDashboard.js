import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../middleware/adminAuth.js';
import { PageView } from '../models/PageView.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { centsToDollars } from '../utils/money.js';
import { decryptCustomerData } from '../utils/encryption.js';

const router = Router();

router.use(requireAdmin);

const querySchema = z.object({
  range: z.enum(['daily', 'week', 'month', '3months', 'all']).optional().default('week'),
  lowStockThreshold: z.coerce.number().int().min(1).max(100).optional().default(5),
  pendingLimit: z.coerce.number().int().min(1).max(20).optional().default(5),
});

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
    const { range, lowStockThreshold, pendingLimit } = querySchema.parse(req.query);
    const { startDate, endDate } = getDateRange(range);

    const pendingStatuses = ['pending_payment', 'paid'];

    const [summaryRows, countRows, pendingOrders, lowStock, trafficRows] =
      await Promise.all([
        Order.aggregate([
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
        ]),
        Order.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Order.aggregate([
          {
            $match: {
              status: { $in: pendingStatuses },
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: pendingLimit },
          {
            $project: {
              _id: 0,
              orderNumber: 1,
              status: 1,
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
        Product.find(
          {
            status: 'active',
            stock: { $lt: lowStockThreshold },
          },
          {
            _id: 0,
            sku: 1,
            name: 1,
            stock: 1,
            status: 1,
          }
        )
          .sort({ stock: 1, name: 1 })
          .limit(5)
          .lean(),
        PageView.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: null,
              totalPageViews: { $sum: 1 },
              uniqueVisitors: {
                $addToSet: {
                  $concat: [
                    '$ipAddress',
                    '-',
                    { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                  ],
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              totalPageViews: 1,
              uniqueVisitors: { $size: '$uniqueVisitors' },
            },
          },
        ]),
      ]);

    const summary = summaryRows[0] ?? { revenueCents: 0, orderCount: 0 };
    const traffic = trafficRows[0] ?? { totalPageViews: 0, uniqueVisitors: 0 };

    const counts = {
      pending_payment: 0,
      paid: 0,
      fulfilled: 0,
      cancelled: 0,
    };
    for (const row of countRows) {
      if (row._id in counts) {
        counts[row._id] = row.count;
      }
    }

    res.json({
      range,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      revenue: centsToDollars(summary.revenueCents),
      orderCount: summary.orderCount,
      totalPageViews: traffic.totalPageViews,
      uniqueVisitors: traffic.uniqueVisitors,
      counts,
      pendingOrders: pendingOrders.map((order) => {
        const customer = decryptCustomerData(order.customer);
        return {
          orderNumber: order.orderNumber,
          status: order.status,
          customer: {
            name: customer?.name ?? null,
            email: customer?.email ?? null,
          },
          totals: {
            total: centsToDollars(order.totals?.totalCents ?? 0),
          },
          itemsCount: order.itemsCount ?? 0,
          createdAt: order.createdAt,
        };
      }),
      lowStock,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
