import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Plus, Search } from 'lucide-react';
import { DataTable, type Column } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { ProductDrawer } from '../components/ProductDrawer';
import { StatusChip } from '../components/StatusChip';
import { useProducts } from '../hooks/useProducts';
import type { Product } from '../types';

export function ProductsPage() {
  const { data, isLoading } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [drawer, setDrawer] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });

  const products = useMemo(() => data ?? [], [data]);

  // Deep-link handling: open drawer for ?sku=<sku> once products have loaded.
  // Guards against repeatedly re-opening the drawer by checking current state.
  const skuParam = searchParams.get('sku');
  useEffect(() => {
    if (!skuParam || products.length === 0) return;
    if (drawer.open && drawer.product?.sku === skuParam) return;
    const match = products.find((p) => p.sku === skuParam);
    if (match) {
      setDrawer({ open: true, product: match });
    }
  }, [skuParam, products, drawer.open, drawer.product?.sku]);

  function handleDrawerOpenChange(v: boolean) {
    setDrawer((prev) => ({ ...prev, open: v }));
    if (!v && searchParams.has('sku')) {
      const next = new URLSearchParams(searchParams);
      next.delete('sku');
      setSearchParams(next, { replace: true });
    }
  }

  const rows = useMemo(() => {
    let list = products;
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(ql) ||
          p.sku?.toLowerCase().includes(ql)
      );
    }
    if (status !== 'all') list = list.filter((p) => p.status === status);
    return list;
  }, [products, q, status]);

  const columns = useMemo<Column<Product>[]>(
    () => [
      {
        key: 'image',
        header: '',
        cell: (p) =>
          p.image ? (
            <img
              src={p.image}
              alt=""
              className="h-10 w-10 rounded object-cover bg-slate-100"
            />
          ) : (
            <div className="h-10 w-10 rounded bg-slate-100" />
          ),
        className: 'w-14',
      },
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        sortValue: (p) => p.name ?? '',
        cell: (p) => (
          <div className="min-w-0">
            <div className="font-medium truncate">{p.name}</div>
            <div className="text-xs text-muted-foreground">{p.sku}</div>
          </div>
        ),
      },
      {
        key: 'price',
        header: 'Price',
        sortable: true,
        sortValue: (p) => p.price ?? 0,
        cell: (p) => (
          <span className="tabular-nums">${(p.price ?? 0).toFixed(2)}</span>
        ),
        className: 'w-24',
      },
      {
        key: 'stock',
        header: 'Stock',
        sortable: true,
        sortValue: (p) => p.stock ?? 0,
        cell: (p) => {
          const low = (p.stock ?? 0) < 5;
          return (
            <span className={`tabular-nums ${low ? 'text-red-600' : ''}`}>
              {p.stock ?? 0}
              {low && ' ●'}
            </span>
          );
        },
        className: 'w-20',
      },
      {
        key: 'status',
        header: 'Status',
        cell: (p) => <StatusChip status={p.status ?? 'active'} />,
        className: 'w-32',
      },
    ],
    []
  );

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">Products</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} of {products.length}
          </p>
        </div>
        <Button onClick={() => setDrawer({ open: true, product: null })}>
          <Plus className="h-4 w-4 mr-2" /> Add product
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            data-page-search
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or SKU…"
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="coming_soon">Coming soon</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.sku}
          onRowClick={(p) => setDrawer({ open: true, product: p })}
          empty={
            <EmptyState
              icon={Package}
              title="No products match"
              description="Clear filters or add a new product."
            />
          }
        />
      )}

      <ProductDrawer
        open={drawer.open}
        onOpenChange={handleDrawerOpenChange}
        product={drawer.product}
      />
    </div>
  );
}
