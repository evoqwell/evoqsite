import { ArrowDown, ArrowUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: string;
  delta?: { text: string; direction: 'up' | 'down' | 'flat' };
};

export function KpiCard({ label, value, delta }: Props) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-3xl font-semibold mt-1 tabular-nums">{value}</div>
        {delta && (
          <div
            className={cn(
              'mt-2 text-xs flex items-center gap-1',
              delta.direction === 'up' && 'text-emerald-600',
              delta.direction === 'down' && 'text-red-600',
              delta.direction === 'flat' && 'text-muted-foreground'
            )}
          >
            {delta.direction === 'up' && <ArrowUp className="h-3 w-3" />}
            {delta.direction === 'down' && <ArrowDown className="h-3 w-3" />}
            <span>{delta.text} vs prev</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
