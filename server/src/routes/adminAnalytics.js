import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import { PageView } from '../models/PageView.js';
import { z } from 'zod';

const router = Router();

router.use(requireAdmin);

const rangeSchema = z.object({
  range: z.enum(['daily', 'week', 'month', '3months', 'all']).optional().default('daily')
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
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  return { startDate, endDate: now };
}

function getTimeSeriesConfig(range) {
  switch (range) {
    case 'daily':
      return {
        dateFormat: '%Y-%m-%d-%H',
        groupBy: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' }, hour: { $hour: '$createdAt' } }
      };
    case 'week':
    case 'month':
      return {
        dateFormat: '%Y-%m-%d',
        groupBy: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } }
      };
    case '3months':
      return {
        dateFormat: '%Y-%U',
        groupBy: { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } }
      };
    case 'all':
      return {
        dateFormat: '%Y-%m',
        groupBy: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }
      };
    default:
      return {
        dateFormat: '%Y-%m-%d-%H',
        groupBy: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' }, hour: { $hour: '$createdAt' } }
      };
  }
}

function formatTimeSeriesLabel(item, range) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  switch (range) {
    case 'daily': {
      const hour = item._id.hour;
      const ampm = hour >= 12 ? 'pm' : 'am';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${hour12}${ampm}`;
    }
    case 'week':
    case 'month': {
      const month = months[item._id.month - 1];
      return `${month} ${item._id.day}`;
    }
    case '3months': {
      return `Week ${item._id.week}`;
    }
    case 'all': {
      const month = months[item._id.month - 1];
      return `${month} ${item._id.year}`;
    }
    default:
      return '';
  }
}

function generateEmptyTimeSeries(range, startDate, endDate) {
  const series = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  switch (range) {
    case 'daily': {
      for (let h = 0; h < 24; h++) {
        const ampm = h >= 12 ? 'pm' : 'am';
        const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        series.push({ label: `${hour12}${ampm}`, pageViews: 0, uniqueVisitors: 0, sortKey: h });
      }
      break;
    }
    case 'week':
    case 'month': {
      const current = new Date(startDate);
      while (current <= endDate) {
        const month = months[current.getMonth()];
        const day = current.getDate();
        series.push({
          label: `${month} ${day}`,
          pageViews: 0,
          uniqueVisitors: 0,
          sortKey: current.getTime()
        });
        current.setDate(current.getDate() + 1);
      }
      break;
    }
    case '3months': {
      const current = new Date(startDate);
      while (current <= endDate) {
        const weekNum = getWeekNumber(current);
        const existing = series.find(s => s.label === `Week ${weekNum}`);
        if (!existing) {
          series.push({
            label: `Week ${weekNum}`,
            pageViews: 0,
            uniqueVisitors: 0,
            sortKey: current.getTime()
          });
        }
        current.setDate(current.getDate() + 7);
      }
      break;
    }
    case 'all': {
      // For 'all', we don't pre-generate - just use what's in the data
      break;
    }
  }

  return series;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getSortKey(id, range) {
  switch (range) {
    case 'daily':
      return id.hour || 0;
    case 'week':
    case 'month':
      return (id.year * 10000) + (id.month * 100) + (id.day || 0);
    case '3months':
      return (id.year * 100) + (id.week || 0);
    case 'all':
      return (id.year * 100) + (id.month || 0);
    default:
      return 0;
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { range } = rangeSchema.parse(req.query);
    const { startDate, endDate } = getDateRange(range);

    const matchStage = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    const tsConfig = getTimeSeriesConfig(range);

    const [totals, byPage, timeSeriesRaw] = await Promise.all([
      // Overall totals
      PageView.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalPageViews: { $sum: 1 },
            uniqueVisitors: {
              $addToSet: {
                $concat: [
                  '$ipAddress',
                  '-',
                  { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                ]
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalPageViews: 1,
            uniqueVisitors: { $size: '$uniqueVisitors' }
          }
        }
      ]),

      // Breakdown by page
      PageView.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$page',
            pageViews: { $sum: 1 },
            uniqueVisitors: {
              $addToSet: {
                $concat: [
                  '$ipAddress',
                  '-',
                  { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                ]
              }
            }
          }
        },
        {
          $project: {
            page: '$_id',
            _id: 0,
            pageViews: 1,
            uniqueVisitors: { $size: '$uniqueVisitors' }
          }
        }
      ]),

      // Time series data by page
      PageView.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { ...tsConfig.groupBy, page: '$page' },
            pageViews: { $sum: 1 },
            uniqueIps: { $addToSet: '$ipAddress' }
          }
        },
        {
          $project: {
            _id: 1,
            pageViews: 1,
            uniqueVisitors: { $size: '$uniqueIps' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1, '_id.day': 1, '_id.hour': 1 } }
      ])
    ]);

    const result = totals[0] || { totalPageViews: 0, uniqueVisitors: 0 };

    // Build time series from actual data, separated by page
    const homepageData = [];
    const productsData = [];

    timeSeriesRaw.forEach(item => {
      const label = formatTimeSeriesLabel(item, range);
      const entry = {
        label,
        pageViews: item.pageViews,
        uniqueVisitors: item.uniqueVisitors,
        sortKey: getSortKey(item._id, range)
      };

      if (item._id.page === 'homepage') {
        homepageData.push(entry);
      } else if (item._id.page === 'products') {
        productsData.push(entry);
      }
    });

    // Sort both arrays
    homepageData.sort((a, b) => a.sortKey - b.sortKey);
    productsData.sort((a, b) => a.sortKey - b.sortKey);

    const timeSeries = {
      homepage: homepageData.map(({ label, pageViews, uniqueVisitors }) => ({ label, pageViews, uniqueVisitors })),
      products: productsData.map(({ label, pageViews, uniqueVisitors }) => ({ label, pageViews, uniqueVisitors }))
    };

    res.json({
      range,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalPageViews: result.totalPageViews,
      uniqueVisitors: result.uniqueVisitors,
      byPage: byPage.reduce((acc, item) => {
        acc[item.page] = {
          pageViews: item.pageViews,
          uniqueVisitors: item.uniqueVisitors
        };
        return acc;
      }, {}),
      timeSeries
    });
  } catch (error) {
    next(error);
  }
});

export default router;
