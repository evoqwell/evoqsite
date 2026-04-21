import { useEffect, useRef } from 'react';

type TsPoint = { label: string; pageViews: number; uniqueVisitors: number };

type ChartInstance = { destroy: () => void };

type Props = {
  analytics:
    | {
        timeSeries?: { homepage?: TsPoint[]; products?: TsPoint[] };
      }
    | undefined;
};

export function TrafficChart({ analytics }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartInstance | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !analytics) return;

    const home = analytics.timeSeries?.homepage ?? [];
    const prods = analytics.timeSeries?.products ?? [];
    const labels = Array.from(new Set([...home, ...prods].map((p) => p.label)));

    const dataFor = (series: TsPoint[], field: 'pageViews' | 'uniqueVisitors') =>
      labels.map((l) => series.find((p) => p.label === l)?.[field] ?? 0);

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Homepage views',
            data: dataFor(home, 'pageViews'),
            borderColor: '#6b5f52',
            backgroundColor: 'rgba(107,95,82,0.12)',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#6b5f52',
            tension: 0.25,
            fill: true,
          },
          {
            label: 'Products views',
            data: dataFor(prods, 'pageViews'),
            borderColor: '#059669',
            backgroundColor: 'rgba(5,150,105,0.12)',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#059669',
            borderDash: [6, 4],
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [analytics]);

  return (
    <div className="h-[300px] relative">
      <canvas ref={canvasRef} />
    </div>
  );
}
