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

describe('normalizeOrderDetail promo codes', () => {
  const base = {
    orderNumber: 'EVQ-1',
    status: 'pending_payment' as const,
    createdAt: '2026-10-28T00:00:00.000Z',
  };

  it('keeps every code the API sends', () => {
    const order = __testUtils.normalizeOrderDetail({
      ...base,
      promoCode: 'SAVE10',
      promoCodes: ['SAVE10', 'FRIEND5'],
    });

    expect(order.promoCodes).toEqual(['SAVE10', 'FRIEND5']);
  });

  it('falls back to the single code from an API that predates the list', () => {
    const order = __testUtils.normalizeOrderDetail({ ...base, promoCode: 'SAVE10' });

    expect(order.promoCodes).toEqual(['SAVE10']);
  });

  it('returns an empty list when no code was used', () => {
    const order = __testUtils.normalizeOrderDetail({ ...base, promoCode: null });

    expect(order.promoCodes).toEqual([]);
  });
});
