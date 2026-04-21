import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '../components/EmptyState';
import { KpiCard } from '../components/KpiCard';
import { TrafficChart } from '../components/TrafficChart';
import { useDashboard } from '../hooks/useDashboard';
import { useAnalytics, type AnalyticsRange } from '../hooks/useAnalytics';
import { formatCurrencyCents, formatRelativeTime } from '../lib/fmt';

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  daily: 'Today',
  week: 'This week',
  month: 'This month',
  '3months': 'Last 3 months',
  all: 'All time',
};

const LOW_STOCK_THRESHOLD = 5;

type AnalyticsData = {
  startDate?: string;
  endDate?: string;
  uniqueVisitors?: number;
  totalPageViews?: number;
  timeSeries?: {
    homepage?: Array<{ label: string; pageViews: number; uniqueVisitors: number }>;
    products?: Array<{ label: string; pageViews: number; uniqueVisitors: number }>;
  };
};

export function DashboardPage() {
  const [range, setRange] = useState<AnalyticsRange>('week');

  const dashboard = useDashboard({
    range,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    pendingLimit: 5,
  });
  const analytics = useAnalytics(range);

  const analyticsData = analytics.data as AnalyticsData | undefined;

  const revenueCents = dashboard.data?.revenueCents ?? 0;
  const orderCount = dashboard.data?.orderCount ?? 0;
  const uniqueVisitors = dashboard.data?.uniqueVisitors ?? 0;
  const conversion = uniqueVisitors > 0 ? (orderCount / uniqueVisitors) * 100 : 0;

  const pendingItems = dashboard.data?.pendingOrders ?? [];
  const lowStock = dashboard.data?.lowStock ?? [];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Overview for {RANGE_LABELS[range].toLowerCase()}
          </p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as AnalyticsRange)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RANGE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboard.isLoading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard label="Revenue" value={formatCurrencyCents(revenueCents)} />
            <KpiCard label="Orders" value={String(orderCount)} />
            <KpiCard label="Visitors" value={uniqueVisitors.toLocaleString()} />
            <KpiCard label="Conversion" value={`${conversion.toFixed(1)}%`} />
          </>
        )}
      </div>

      {/* Action stacks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Orders to fulfill</CardTitle>
            <Link
              to="/admin/orders?status=pending_payment,paid"
              className="text-sm text-brand-brown hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {dashboard.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : pendingItems.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="You're all caught up." />
            ) : (
              <ul className="divide-y">
                {pendingItems.slice(0, 5).map((o) => (
                  <li key={o.orderNumber}>
                    <Link
                      to={`/admin/orders/${o.orderNumber}`}
                      className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-sm">#{o.orderNumber}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {o.customer?.name ?? ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium tabular-nums">
                          {formatCurrencyCents(o.totals.totalCents)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatRelativeTime(o.createdAt)}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Needs attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Low stock (&lt; {LOW_STOCK_THRESHOLD})
              </div>
              {dashboard.isLoading ? (
                <Skeleton className="h-10" />
              ) : lowStock.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Everything's well stocked.
                </div>
              ) : (
                <ul className="space-y-2">
                  {lowStock.slice(0, 5).map((p) => (
                    <li key={p.sku} className="flex items-center justify-between text-sm">
                      <Link
                        to={`/admin/products?sku=${p.sku}`}
                        className="hover:underline flex items-center gap-2"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        {p.name}
                      </Link>
                      <Badge variant="destructive">{p.stock ?? 0} left</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Traffic</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <TrafficChart analytics={analyticsData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}
