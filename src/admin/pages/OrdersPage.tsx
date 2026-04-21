import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { DataTable, type Column } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { StatusChip } from '../components/StatusChip';
import {
  useDeleteOrder,
  useOrderCounts,
  useOrdersList,
  useUpdateOrderStatus,
  type OrdersListItem,
} from '../hooks/useOrders';
import { formatCurrencyCents, formatRelativeTime } from '../lib/fmt';
import type { OrderStatus } from '../types';

// TODO(phase-8): add a date-range picker alongside the status chips
// (deferred from phase 5 + 7 — current filters cover the 95% case).

const STATUS_FILTERS: Array<{ key: 'all' | OrderStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending_payment', label: 'Pending payment' },
  { key: 'paid', label: 'Paid' },
  { key: 'fulfilled', label: 'Fulfilled' },
  { key: 'cancelled', label: 'Cancelled' },
];

const INITIAL_PAGE_SIZE = 50;
const LOAD_MORE_STEP = 50;
const MAX_PAGE_SIZE = 200;

export function OrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get('status');
  const activeStatus: 'all' | OrderStatus =
    statusParam === 'pending_payment' ||
    statusParam === 'paid' ||
    statusParam === 'fulfilled' ||
    statusParam === 'cancelled'
      ? statusParam
      : 'all';
  const q = searchParams.get('q') ?? '';

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(INITIAL_PAGE_SIZE);

  // Server-side status filter + pagination. Page-size grows on "Load more" —
  // simpler than accumulating pages client-side, and the server caps at 200.
  const { data, isLoading } = useOrdersList({
    status: activeStatus === 'all' ? undefined : activeStatus,
    limit,
  });
  const { data: counts } = useOrderCounts();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();

  const items = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  // Chip counts come straight from the server aggregation — stays stable
  // regardless of current filter/search.
  const chipCounts = useMemo(() => {
    const c = counts ?? {
      pending_payment: 0,
      paid: 0,
      fulfilled: 0,
      cancelled: 0,
    };
    const all = c.pending_payment + c.paid + c.fulfilled + c.cancelled;
    return {
      all,
      pending_payment: c.pending_payment,
      paid: c.paid,
      fulfilled: c.fulfilled,
      cancelled: c.cancelled,
    } as Record<'all' | OrderStatus, number>;
  }, [counts]);

  // Client-side search over the currently loaded page.
  // TODO(phase-8): move search server-side so it isn't bounded by the page size.
  const filtered = useMemo(() => {
    if (!q) return items;
    const ql = q.toLowerCase();
    return items.filter((o) => {
      const name = o.customer?.name?.toLowerCase() ?? '';
      const email = o.customer?.email?.toLowerCase() ?? '';
      const num = o.orderNumber?.toLowerCase() ?? '';
      return num.includes(ql) || name.includes(ql) || email.includes(ql);
    });
  }, [items, q]);

  function setStatusFilter(next: 'all' | OrderStatus) {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('status');
    else params.set('status', next);
    setSearchParams(params, { replace: true });
    setSelected(new Set());
    setLimit(INITIAL_PAGE_SIZE);
  }

  function setSearch(value: string) {
    const params = new URLSearchParams(searchParams);
    if (!value) params.delete('q');
    else params.set('q', value);
    setSearchParams(params, { replace: true });
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams(), { replace: true });
    setLimit(INITIAL_PAGE_SIZE);
  }

  const columns = useMemo<Column<OrdersListItem>[]>(
    () => [
      {
        key: 'orderNumber',
        header: 'Order #',
        sortable: true,
        sortValue: (o) => o.orderNumber,
        cell: (o) => (
          <span className="font-mono text-sm">#{o.orderNumber}</span>
        ),
        className: 'w-28',
      },
      {
        key: 'customer',
        header: 'Customer',
        cell: (o) => (
          <div className="min-w-0">
            <div className="font-medium truncate">
              {o.customer?.name ?? '—'}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {o.customer?.email ?? ''}
            </div>
          </div>
        ),
      },
      {
        key: 'items',
        header: 'Items',
        sortable: true,
        sortValue: (o) => o.itemsCount,
        cell: (o) => (
          <span className="tabular-nums">{o.itemsCount}</span>
        ),
        className: 'w-20',
      },
      {
        key: 'total',
        header: 'Total',
        sortable: true,
        sortValue: (o) => o.totals.totalCents,
        cell: (o) => (
          <span className="tabular-nums font-medium">
            {formatCurrencyCents(o.totals.totalCents)}
          </span>
        ),
        className: 'w-28',
      },
      {
        key: 'status',
        header: 'Status',
        cell: (o) => <StatusChip status={o.status} />,
        className: 'w-36',
      },
      {
        key: 'placed',
        header: 'Placed',
        sortable: true,
        sortValue: (o) => new Date(o.createdAt).getTime(),
        cell: (o) => (
          <span className="text-sm text-muted-foreground">
            {formatRelativeTime(o.createdAt)}
          </span>
        ),
        className: 'w-28',
      },
    ],
    []
  );

  async function bulkUpdateStatus(next: OrderStatus) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(
      ids.map((orderNumber) =>
        updateStatus.mutateAsync({ orderNumber, status: next })
      )
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - ok;
    if (ok > 0) {
      toast.success(
        `Updated ${ok} ${ok === 1 ? 'order' : 'orders'} to ${next.replace('_', ' ')}`
      );
    }
    if (failed > 0) toast.error(`${failed} failed to update`);
    setSelected(new Set());
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(
      ids.map((orderNumber) => deleteOrder.mutateAsync(orderNumber))
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - ok;
    if (ok > 0) {
      toast.success(`Deleted ${ok} ${ok === 1 ? 'order' : 'orders'}`);
    }
    if (failed > 0) toast.error(`${failed} failed to delete`);
    setSelected(new Set());
  }

  const hasFilters = activeStatus !== 'all' || q.length > 0;
  const canLoadMore = hasMore && limit < MAX_PAGE_SIZE;

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">Orders</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {total}
          </p>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            data-page-search
            value={q}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, name, or email…"
            className="pl-8"
          />
        </div>
      </div>

      {/* Status chip toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map(({ key, label }) => {
          const isActive = activeStatus === key;
          return (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={isActive ? 'default' : 'outline'}
              onClick={() => setStatusFilter(key)}
              className={cn(
                'h-8',
                isActive && 'bg-brand-brown hover:bg-brand-brown-dark text-white'
              )}
            >
              {label} <span className="ml-1.5 tabular-nums opacity-80">·  {chipCounts[key] ?? 0}</span>
            </Button>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-slate-100 border">
          <span className="text-sm font-medium">
            {selected.size} selected
          </span>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkUpdateStatus('paid')}
              disabled={updateStatus.isPending}
            >
              Mark paid
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkUpdateStatus('fulfilled')}
              disabled={updateStatus.isPending}
            >
              Mark fulfilled
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkUpdateStatus('cancelled')}
              disabled={updateStatus.isPending}
            >
              Mark cancelled
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={bulkDelete}
              disabled={deleteOrder.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <>
          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(o) => o.orderNumber}
            selectable
            selected={selected}
            onSelectedChange={setSelected}
            onRowClick={(o) => navigate(`/admin/orders/${o.orderNumber}`)}
            empty={
              <EmptyState
                icon={ShoppingBag}
                title="No orders match these filters"
                action={
                  hasFilters ? (
                    <Button variant="outline" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            }
          />

          {canLoadMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() =>
                  setLimit((l) => Math.min(l + LOAD_MORE_STEP, MAX_PAGE_SIZE))
                }
              >
                Load more ({Math.max(total - items.length, 0)} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
