import { describe, expect, it } from 'vitest';
import { __testUtils } from './useOrders';

describe('useOrders optimistic raw cache helpers', () => {
  it('updates matching orders in an unfiltered raw list response', () => {
    const next = __testUtils.applyOptimisticStatusToRawList(
      {
        orders: [
          {
            orderNumber: 'EVQ-1',
            status: 'paid',
            createdAt: '2026-04-20T00:00:00.000Z',
          },
        ],
        total: 1,
        hasMore: false,
        limit: 50,
        skip: 0,
      },
      {
        orderNumber: 'EVQ-1',
        status: 'fulfilled',
        filterStatus: null,
      }
    );

    expect(next?.orders?.[0]?.status).toBe('fulfilled');
    expect(next?.total).toBe(1);
  });

  it('removes an order from a filtered raw list when the new status no longer matches', () => {
    const next = __testUtils.applyOptimisticStatusToRawList(
      {
        orders: [
          {
            orderNumber: 'EVQ-1',
            status: 'paid',
            createdAt: '2026-04-20T00:00:00.000Z',
          },
          {
            orderNumber: 'EVQ-2',
            status: 'paid',
            createdAt: '2026-04-20T00:01:00.000Z',
          },
        ],
        total: 2,
        hasMore: false,
        limit: 50,
        skip: 0,
      },
      {
        orderNumber: 'EVQ-1',
        status: 'fulfilled',
        filterStatus: 'paid',
      }
    );

    expect(next?.orders?.map((item) => item.orderNumber)).toEqual(['EVQ-2']);
    expect(next?.total).toBe(1);
    expect(next?.hasMore).toBe(false);
  });
});
