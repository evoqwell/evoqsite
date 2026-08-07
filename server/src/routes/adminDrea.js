import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../middleware/adminAuth.js';
import { DreaEntry } from '../models/DreaEntry.js';
import { centsToDollars, dollarsToCents } from '../utils/money.js';
import { parseDateOnly } from '../utils/dateOnly.js';

const router = Router();

router.use(requireAdmin);

// This router never touches Order or Expense. Drea's books are hers alone.

const createSchema = z.object({
  type: z.enum(['income', 'expense']),
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
  type: z.enum(['income', 'expense']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200)
});

function serializeEntry(doc) {
  return {
    id: doc._id?.toString() ?? doc.id,
    type: doc.type,
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
    const { period, type, from, to, limit } = listQuerySchema.parse(req.query);

    const filter = {};
    const now = new Date();

    if (type) filter.type = type;

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = parseDateOnly(from);
      if (to) filter.date.$lte = parseDateOnly(to);
    } else if (period === 'month') {
      filter.date = { $gte: startOfMonth(now) };
    } else if (period === 'year') {
      filter.date = { $gte: startOfYear(now) };
    }

    const entries = await DreaEntry.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ entries: entries.map(serializeEntry) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = createSchema.parse(req.body);

    const entry = await DreaEntry.create({
      type: payload.type,
      description: payload.description,
      amountCents: dollarsToCents(payload.amount),
      date: parseDateOnly(payload.date)
    });

    res.status(201).json(serializeEntry(entry.toObject()));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await DreaEntry.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Entry not found.' });
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

    // One aggregation per window, grouped by type, so income and expense come
    // back in a single round trip each.
    const [monthRows, yearRows, allRows] = await Promise.all([
      DreaEntry.aggregate([
        { $match: { date: { $gte: monthStart } } },
        { $group: { _id: '$type', total: { $sum: '$amountCents' }, count: { $sum: 1 } } }
      ]),
      DreaEntry.aggregate([
        { $match: { date: { $gte: yearStart } } },
        { $group: { _id: '$type', total: { $sum: '$amountCents' }, count: { $sum: 1 } } }
      ]),
      DreaEntry.aggregate([
        { $group: { _id: '$type', total: { $sum: '$amountCents' }, count: { $sum: 1 } } }
      ])
    ]);

    function bucket(rows) {
      const income = rows.find((row) => row._id === 'income');
      const expense = rows.find((row) => row._id === 'expense');
      const incomeCents = income?.total ?? 0;
      const expenseCents = expense?.total ?? 0;
      return {
        incomeCents,
        expenseCents,
        netCents: incomeCents - expenseCents,
        income: centsToDollars(incomeCents),
        expense: centsToDollars(expenseCents),
        net: centsToDollars(incomeCents - expenseCents),
        incomeCount: income?.count ?? 0,
        expenseCount: expense?.count ?? 0
      };
    }

    res.json({
      asOf: now.toISOString(),
      month: { startDate: monthStart.toISOString(), ...bucket(monthRows) },
      year: { startDate: yearStart.toISOString(), ...bucket(yearRows) },
      all: bucket(allRows)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
