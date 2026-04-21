import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { PromoDrawer } from '../components/PromoDrawer';
import { usePromos, useUpdatePromo } from '../hooks/usePromos';
import type { Promo } from '../types';

function formatDiscount(p: Promo) {
  if (p.discountType === 'percentage') return `${p.discountValue}%`;
  return `$${Number(p.discountValue ?? 0).toFixed(2)}`;
}

export function PromosPage() {
  const { data, isLoading } = usePromos();
  const { mutate: updatePromo } = useUpdatePromo();

  const [q, setQ] = useState('');
  const [drawer, setDrawer] = useState<{ open: boolean; promo: Promo | null }>({
    open: false,
    promo: null,
  });

  const promos = useMemo(() => data ?? [], [data]);

  const rows = useMemo(() => {
    if (!q) return promos;
    const ql = q.toLowerCase();
    return promos.filter((p) => p.code?.toLowerCase().includes(ql));
  }, [promos, q]);

  const columns = useMemo<Column<Promo>[]>(
    () => [
      {
        key: 'code',
        header: 'Code',
        sortable: true,
        sortValue: (p) => p.code ?? '',
        cell: (p) => <span className="font-mono font-medium">{p.code}</span>,
      },
      {
        key: 'type',
        header: 'Type',
        cell: (p) => (
          <span className="capitalize text-sm text-muted-foreground">
            {p.discountType === 'fixed' ? 'Fixed' : 'Percentage'}
          </span>
        ),
        className: 'w-32',
      },
      {
        key: 'value',
        header: 'Value',
        sortable: true,
        sortValue: (p) => p.discountValue ?? 0,
        cell: (p) => <span className="tabular-nums">{formatDiscount(p)}</span>,
        className: 'w-24',
      },
      {
        key: 'active',
        header: 'Active',
        cell: (p) => (
          <Switch
            checked={!!p.isActive}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={(checked) => {
              updatePromo(
                { code: p.code, payload: { isActive: checked } },
                {
                  onSuccess: () =>
                    toast.success(
                      checked ? 'Promo activated' : 'Promo deactivated'
                    ),
                  onError: (e: unknown) =>
                    toast.error((e as Error).message),
                }
              );
            }}
          />
        ),
        className: 'w-20',
      },
      {
        key: 'description',
        header: 'Description',
        cell: (p) => (
          <span className="text-sm text-muted-foreground truncate block">
            {p.description || '—'}
          </span>
        ),
      },
    ],
    [updatePromo]
  );

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">Promos</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} of {promos.length}
          </p>
        </div>
        <Button onClick={() => setDrawer({ open: true, promo: null })}>
          <Plus className="h-4 w-4 mr-2" /> Add promo
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            data-page-search
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code…"
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.code}
          onRowClick={(p) => setDrawer({ open: true, promo: p })}
          empty={
            <EmptyState
              icon={Tag}
              title="No promos match"
              description="Clear filters or add a new promo."
            />
          }
        />
      )}

      <PromoDrawer
        open={drawer.open}
        onOpenChange={(v) => setDrawer((prev) => ({ ...prev, open: v }))}
        promo={drawer.promo}
      />
    </div>
  );
}
