import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../middleware/adminAuth.js';
import { Expense } from '../models/Expense.js';
import { Order } from '../models/Order.js';
import { centsToDollars, dollarsToCents } from '../utils/money.js';

const router = Router();

router.use(requireAdmin);

const REVENUE_STATUSES = ['paid', 'fulfilled'];

const createSchema = z.object({
  description: z.string().trim().min(1).max(500),
  amount: z.number().nonnegative(),
  date: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: 'Invalid date.'
    })
});

const listQuerySchema = z.object({
  period: z.enum(['month', 'year', 'all']).optional().default('all'),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200)
});

function serializeExpense(doc) {
  return {
    id: doc._id?.toString() ?? doc.id,
    description: doc.description,
    amount: centsToDollars(doc.amountCents),
    amountCents: doc.amountCents,
    date: doc.date?.toISOString?.() ?? doc.date,
    createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt
  };
}

function startOfMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfYear(now = new Date()) {
  return new Date(now.getFullYear(), 0, 1);
}

router.get('/', async (req, res, next) => {
  try {
    const { period, from, to, limit } = listQuerySchema.parse(req.query);

    const filter = {};
    const now = new Date();

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    } else if (period === 'month') {
      filter.date = { $gte: startOfMonth(now) };
    } else if (period === 'year') {
      filter.date = { $gte: startOfYear(now) };
    }

    const expenses = await Expense.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      expenses: expenses.map(serializeExpense)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = createSchema.parse(req.body);
    const amountCents = dollarsToCents(payload.amount);

    const expense = await Expense.create({
      description: payload.description,
      amountCents,
      date: new Date(payload.date)
    });

    res.status(201).json(serializeExpense(expense.toObject()));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await Expense.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Expense not found.' });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get('/summary', async (req, res, next) => {
  try {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    const [
      monthExpenseRows,
      yearExpenseRows,
      allExpenseRows,
      monthRevenueRows,
      yearRevenueRows,
      allRevenueRows
    ] = await Promise.all([
      Expense.aggregate([
        { $match: { date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amountCents' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: yearStart } } },
        { $group: { _id: null, total: { $sum: '$amountCents' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $group: { _id: null, total: { $sum: '$amountCents' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $in: REVENUE_STATUSES },
            createdAt: { $gte: monthStart }
          }
        },
        { $group: { _id: null, total: { $sum: '$totals.totalCents' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $in: REVENUE_STATUSES },
            createdAt: { $gte: yearStart }
          }
        },
        { $group: { _id: null, total: { $sum: '$totals.totalCents' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { status: { $in: REVENUE_STATUSES } } },
        { $group: { _id: null, total: { $sum: '$totals.totalCents' }, count: { $sum: 1 } } }
      ])
    ]);

    function bucket(expenseRow, revenueRow) {
      const expenseCents = expenseRow?.total ?? 0;
      const revenueCents = revenueRow?.total ?? 0;
      return {
        expenseCents,
        revenueCents,
        grossProfitCents: revenueCents - expenseCents,
        expense: centsToDollars(expenseCents),
        revenue: centsToDollars(revenueCents),
        grossProfit: centsToDollars(revenueCents - expenseCents),
        expenseCount: expenseRow?.count ?? 0,
        orderCount: revenueRow?.count ?? 0
      };
    }

    res.json({
      asOf: now.toISOString(),
      month: {
        startDate: monthStart.toISOString(),
        ...bucket(monthExpenseRows[0], monthRevenueRows[0])
      },
      year: {
        startDate: yearStart.toISOString(),
        ...bucket(yearExpenseRows[0], yearRevenueRows[0])
      },
      all: bucket(allExpenseRows[0], allRevenueRows[0])
    });
  } catch (error) {
    next(error);
  }
});

export default router;
