import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '../components/KpiCard';
import { TrafficChart } from '../components/TrafficChart';
import { useAnalytics, type AnalyticsRange } from '../hooks/useAnalytics';

const LABELS: Record<AnalyticsRange, string> = {
  daily: 'Today',
  week: 'Last 7 days',
  month: 'Last 30 days',
  '3months': 'Last 3 months',
  all: 'All time',
};

type PageStat = { pageViews: number; uniqueVisitors: number };

type Analytics = {
  uniqueVisitors?: number;
  totalPageViews?: number;
  byPage?: Record<string, PageStat>;
  timeSeries?: {
    homepage?: Array<{ label: string; pageViews: number; uniqueVisitors: number }>;
    products?: Array<{ label: string; pageViews: number; uniqueVisitors: number }>;
  };
  startDate?: string;
  endDate?: string;
};

export function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('week');
  const { data, isLoading } = useAnalytics(range);
  const analytics = data as Analytics | undefined;

  const breakdownRows = useMemo(() => {
    const byPage = analytics?.byPage ?? {};
    const total = analytics?.totalPageViews ?? 0;
    return Object.entries(byPage)
      .map(([page, v]) => ({
        page,
        pageViews: v.pageViews,
        uniqueVisitors: v.uniqueVisitors,
        pct: total > 0 ? (v.pageViews / total) * 100 : 0,
      }))
      .sort((a, b) => b.pageViews - a.pageViews);
  }, [analytics?.byPage, analytics?.totalPageViews]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Analytics</h2>
        <Select value={range} onValueChange={(v) => setRange(v as AnalyticsRange)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <KpiCard
              label="Unique visitors"
              value={(analytics?.uniqueVisitors ?? 0).toLocaleString()}
            />
            <KpiCard
              label="Page views"
              value={(analytics?.totalPageViews ?? 0).toLocaleString()}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Traffic over time</CardTitle>
        </CardHeader>
        <CardContent>
          <TrafficChart analytics={analytics} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown by page</CardTitle>
        </CardHeader>
        <CardContent>
          {breakdownRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data in this range.</p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="p-3">Page</th>
                    <th className="p-3">Visitors</th>
                    <th className="p-3">Views</th>
                    <th className="p-3 w-40">% of total</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownRows.map((r) => (
                    <tr key={r.page} className="border-t">
                      <td className="p-3 capitalize">{r.page}</td>
                      <td className="p-3 tabular-nums">
                        {r.uniqueVisitors.toLocaleString()}
                      </td>
                      <td className="p-3 tabular-nums">
                        {r.pageViews.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-brand-brown"
                              style={{ width: `${r.pct}%` }}
                            />
                          </div>
                          <span className="tabular-nums w-10 text-right">
                            {r.pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
