import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchAdminDashboardSummary } from '../../../lib/adminApi.js';
import type { OrderStatus, ProductStatus } from '../types';
import type { AnalyticsRange } from './useAnalytics';

export type DashboardSummaryOptions = {
  range: AnalyticsRange;
  lowStockThreshold?: number;
  pendingLimit?: number;
};

export type DashboardPendingOrder = {
  orderNumber: string;
  status: OrderStatus;
  customer: { name: string | null; email: string | null };
  totals: { total: number; totalCents: number };
  itemsCount: number;
  createdAt: string;
};

export type DashboardSummary = {
  range: AnalyticsRange;
  startDate: string;
  endDate: string;
  revenue: number;
  revenueCents: number;
  orderCount: number;
  totalPageViews: number;
  uniqueVisitors: number;
  counts: Record<OrderStatus, number>;
  pendingOrders: DashboardPendingOrder[];
  lowStock: Array<{
    sku: string;
    name: string;
    stock: number;
    status: ProductStatus | string;
  }>;
};

type RawDashboardPendingOrder = {
  orderNumber: string;
  status: OrderStatus;
  customer?: { name?: string | null; email?: string | null } | null;
  totals?: { total?: number } | null;
  itemsCount?: number;
  createdAt: string;
};

type RawDashboardSummary = {
  range?: AnalyticsRange;
  startDate?: string;
  endDate?: string;
  revenue?: number;
  orderCount?: number;
  totalPageViews?: number;
  uniqueVisitors?: number;
  counts?: Partial<Record<OrderStatus, number>>;
  pendingOrders?: RawDashboardPendingOrder[];
  lowStock?: Array<{
    sku: string;
    name: string;
    stock?: number;
    status?: ProductStatus | string;
  }>;
};

export function dashboardSummaryKey(options: DashboardSummaryOptions) {
  return [
    'dashboard',
    {
      range: options.range,
      lowStockThreshold: options.lowStockThreshold ?? 5,
      pendingLimit: options.pendingLimit ?? 5,
    },
  ] as const;
}

function normalizePendingOrder(raw: RawDashboardPendingOrder): DashboardPendingOrder {
  const total = raw.totals?.total ?? 0;
  return {
    orderNumber: raw.orderNumber,
    status: raw.status,
    customer: {
      name: raw.customer?.name ?? null,
      email: raw.customer?.email ?? null,
    },
    totals: {
      total,
      totalCents: Math.round(total * 100),
    },
    itemsCount: raw.itemsCount ?? 0,
    createdAt: raw.createdAt,
  };
}

export function useDashboard(options: DashboardSummaryOptions) {
  const normalized = {
    range: options.range,
    lowStockThreshold: options.lowStockThreshold ?? 5,
    pendingLimit: options.pendingLimit ?? 5,
  };

  return useQuery({
    queryKey: dashboardSummaryKey(normalized),
    queryFn: () => fetchAdminDashboardSummary(null, normalized),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    select: (data: unknown): DashboardSummary => {
      const raw = (data ?? {}) as RawDashboardSummary;
      const revenue = raw.revenue ?? 0;
      return {
        range: raw.range ?? normalized.range,
        startDate: raw.startDate ?? '',
        endDate: raw.endDate ?? '',
        revenue,
        revenueCents: Math.round(revenue * 100),
        orderCount: raw.orderCount ?? 0,
        totalPageViews: raw.totalPageViews ?? 0,
        uniqueVisitors: raw.uniqueVisitors ?? 0,
        counts: {
          pending_payment: raw.counts?.pending_payment ?? 0,
          paid: raw.counts?.paid ?? 0,
          fulfilled: raw.counts?.fulfilled ?? 0,
          cancelled: raw.counts?.cancelled ?? 0,
        },
        pendingOrders: (raw.pendingOrders ?? []).map(normalizePendingOrder),
        lowStock: (raw.lowStock ?? []).map((product) => ({
          sku: product.sku,
          name: product.name,
          stock: product.stock ?? 0,
          status: product.status ?? 'active',
        })),
      };
    },
  });
}
