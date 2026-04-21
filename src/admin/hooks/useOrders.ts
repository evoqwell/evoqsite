import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import {
  deleteAdminOrder,
  fetchAdminOrder,
  fetchAdminOrderCounts,
  fetchAdminOrdersList,
  fetchAdminOrderSummary,
  updateAdminOrderStatus,
} from '../../../lib/adminApi.js';
import type { Order, OrderStatus } from '../types';
import type { AnalyticsRange } from './useAnalytics';

// ---------- Types ----------

export type OrdersListParams = {
  status?: string | string[];
  limit?: number;
  skip?: number;
};

export type OrdersListItem = {
  orderNumber: string;
  status: OrderStatus;
  customer: { name: string | null; email: string | null };
  totals: { total: number; totalCents: number };
  itemsCount: number;
  createdAt: string;
};

export type OrdersListResult = {
  items: OrdersListItem[];
  total: number;
  hasMore: boolean;
  limit: number;
  skip: number;
};

export type OrderCounts = Record<
  'pending_payment' | 'paid' | 'fulfilled' | 'cancelled',
  number
>;

export type OrderSummary = {
  revenue: number;
  revenueCents: number;
  orderCount: number;
  startDate: string;
  endDate: string;
  range: string;
};

// ---------- Raw server shapes ----------

type RawListItem = {
  orderNumber: string;
  status: OrderStatus;
  customer?: { name?: string | null; email?: string | null } | null;
  totals?: { total?: number } | null;
  itemsCount?: number;
  createdAt: string;
};

type RawListResponse = {
  orders?: RawListItem[];
  total?: number;
  hasMore?: boolean;
  limit?: number;
  skip?: number;
};

type RawOrderDetail = {
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  promoCode?: string | null;
  venmoNote?: string;
  customer?: Order['customer'];
  items?: Array<{
    sku: string;
    name: string;
    quantity: number;
    price?: number;
    lineTotal?: number;
  }>;
  totals?: {
    subtotal?: number;
    discount?: number;
    shipping?: number;
    total?: number;
  };
};

type RawSummary = {
  range: string;
  startDate: string;
  endDate: string;
  revenue: number;
  orderCount: number;
};

// ---------- Invalidation helper ----------

function invalidateOrderQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['orders', 'list'] });
  qc.invalidateQueries({ queryKey: ['orders', 'counts'] });
  qc.invalidateQueries({ queryKey: ['orders', 'summary'] });
  qc.invalidateQueries({ queryKey: ['orders', 'detail'] });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
}

// ---------- Normalizers ----------

function normalizeListItem(raw: RawListItem): OrdersListItem {
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

function normalizeOrderDetail(o: RawOrderDetail): Order {
  return {
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt,
    promoCode: o.promoCode,
    venmoNote: o.venmoNote,
    customer: o.customer,
    totals: {
      ...(o.totals ?? {}),
      subtotalCents: Math.round((o.totals?.subtotal ?? 0) * 100),
      discountCents: Math.round((o.totals?.discount ?? 0) * 100),
      shippingCents: Math.round((o.totals?.shipping ?? 0) * 100),
      totalCents: Math.round((o.totals?.total ?? 0) * 100),
    },
    items: (o.items ?? []).map((i) => ({
      ...i,
      priceCents: Math.round((i.price ?? 0) * 100),
      lineTotalCents: Math.round((i.lineTotal ?? 0) * 100),
    })),
  };
}

function getRawListItems(raw: RawListResponse | undefined) {
  return raw?.orders ?? [];
}

function applyOptimisticStatusToRawList(
  raw: RawListResponse | undefined,
  {
    orderNumber,
    status,
    filterStatus,
  }: {
    orderNumber: string;
    status: OrderStatus;
    filterStatus: string | null | undefined;
  }
): RawListResponse | undefined {
  if (!raw) return raw;

  const orders = getRawListItems(raw);
  const currentItem = orders.find((item) => item.orderNumber === orderNumber);
  if (!currentItem) return raw;

  const shouldKeep = matchesStatusFilter(filterStatus, status);
  const nextOrders = shouldKeep
    ? orders.map((item) =>
        item.orderNumber === orderNumber ? { ...item, status } : item
      )
    : orders.filter((item) => item.orderNumber !== orderNumber);
  const currentTotal = raw.total ?? orders.length;
  const nextTotal = shouldKeep ? currentTotal : Math.max(currentTotal - 1, 0);
  const skip = raw.skip ?? 0;

  return {
    ...raw,
    orders: nextOrders,
    total: nextTotal,
    hasMore: skip + nextOrders.length < nextTotal,
  };
}

// ---------- Hooks ----------

function listKey(params: OrdersListParams) {
  // Normalize status to a stable string for cache keying.
  const status = Array.isArray(params.status)
    ? params.status.slice().sort().join(',')
    : params.status ?? null;
  return [
    'orders',
    'list',
    { status, limit: params.limit ?? null, skip: params.skip ?? null },
  ] as const;
}

function matchesStatusFilter(filterStatus: string | null | undefined, status: OrderStatus) {
  if (!filterStatus) return true;
  const allowed = filterStatus.split(',').filter(Boolean);
  return allowed.length === 0 || allowed.includes(status);
}

type OrderMutationSnapshot = {
  previousLists: Array<[QueryKey, RawListResponse | undefined]>;
  previousDetail: RawOrderDetail | undefined;
  previousCounts: OrderCounts | undefined;
};

export function useOrdersList(params: OrdersListParams) {
  return useQuery({
    queryKey: listKey(params),
    queryFn: () => fetchAdminOrdersList(null, params),
    placeholderData: keepPreviousData,
    select: (data: unknown): OrdersListResult => {
      const raw = (data ?? {}) as RawListResponse;
      const items = (raw.orders ?? []).map(normalizeListItem);
      return {
        items,
        total: raw.total ?? items.length,
        hasMore: raw.hasMore ?? false,
        limit: raw.limit ?? params.limit ?? items.length,
        skip: raw.skip ?? params.skip ?? 0,
      };
    },
  });
}

export function useOrderCounts() {
  return useQuery({
    queryKey: ['orders', 'counts'],
    queryFn: () => fetchAdminOrderCounts(null),
    refetchInterval: 30_000,
    select: (data: unknown): OrderCounts => {
      const raw = (data ?? {}) as Partial<OrderCounts>;
      return {
        pending_payment: raw.pending_payment ?? 0,
        paid: raw.paid ?? 0,
        fulfilled: raw.fulfilled ?? 0,
        cancelled: raw.cancelled ?? 0,
      };
    },
  });
}

export function useOrderSummary(range: AnalyticsRange) {
  return useQuery({
    queryKey: ['orders', 'summary', range],
    queryFn: () => fetchAdminOrderSummary(null, range),
    placeholderData: keepPreviousData,
    select: (data: unknown): OrderSummary => {
      const raw = (data ?? {}) as Partial<RawSummary>;
      const revenue = raw.revenue ?? 0;
      return {
        range: raw.range ?? range,
        startDate: raw.startDate ?? '',
        endDate: raw.endDate ?? '',
        revenue,
        revenueCents: Math.round(revenue * 100),
        orderCount: raw.orderCount ?? 0,
      };
    },
  });
}

export function useOrder(orderNumber: string | undefined) {
  return useQuery({
    queryKey: ['orders', 'detail', orderNumber ?? null],
    queryFn: () => fetchAdminOrder(null, orderNumber as string),
    enabled: Boolean(orderNumber),
    select: (data: unknown): Order => normalizeOrderDetail(data as RawOrderDetail),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderNumber, status }: { orderNumber: string; status: OrderStatus }) =>
      updateAdminOrderStatus(null, orderNumber, status),
    onMutate: async ({
      orderNumber,
      status,
    }): Promise<OrderMutationSnapshot> => {
      await Promise.all([
        qc.cancelQueries({ queryKey: ['orders'] }),
        qc.cancelQueries({ queryKey: ['dashboard'] }),
      ]);

      const previousLists = qc.getQueriesData<RawListResponse>({
        queryKey: ['orders', 'list'],
      });
      const previousDetail = qc.getQueryData<RawOrderDetail>([
        'orders',
        'detail',
        orderNumber,
      ]);
      const previousCounts = qc.getQueryData<OrderCounts>(['orders', 'counts']);

      let previousStatus = previousDetail?.status;

      if (!previousStatus) {
        for (const [, list] of previousLists) {
          const match = getRawListItems(list).find(
            (item) => item.orderNumber === orderNumber
          );
          if (match) {
            previousStatus = match.status;
            break;
          }
        }
      }

      if (previousDetail) {
        qc.setQueryData<RawOrderDetail>(['orders', 'detail', orderNumber], {
          ...previousDetail,
          status,
        });
      }

      for (const [queryKey, list] of previousLists) {
        const filterStatus =
          Array.isArray(queryKey) &&
          typeof queryKey[2] === 'object' &&
          queryKey[2] !== null &&
          'status' in queryKey[2]
            ? ((queryKey[2] as { status?: string | null }).status ?? null)
            : null;
        qc.setQueryData<RawListResponse>(
          queryKey,
          applyOptimisticStatusToRawList(list, {
            orderNumber,
            status,
            filterStatus,
          })
        );
      }

      if (previousStatus && previousCounts && previousStatus !== status) {
        qc.setQueryData<OrderCounts>(['orders', 'counts'], {
          ...previousCounts,
          [previousStatus]: Math.max((previousCounts[previousStatus] ?? 0) - 1, 0),
          [status]: (previousCounts[status] ?? 0) + 1,
        });
      }

      return { previousLists, previousDetail, previousCounts };
    },
    onError: (_error, variables, context) => {
      if (!context) return;

      for (const [queryKey, list] of context.previousLists) {
        qc.setQueryData(queryKey, list);
      }

      qc.setQueryData(['orders', 'detail', variables.orderNumber], context.previousDetail);
      qc.setQueryData(['orders', 'counts'], context.previousCounts);
    },
    onSettled: () => invalidateOrderQueries(qc),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: string) => deleteAdminOrder(null, orderNumber),
    onSuccess: () => invalidateOrderQueries(qc),
  });
}

export const __testUtils = {
  applyOptimisticStatusToRawList,
};
