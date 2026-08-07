import { useMemo, useState } from 'react';
import { Plus, Scissors, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable, type Column } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { KpiCard } from '../components/KpiCard';
import { formatDate } from '../lib/fmt';
import {
  useCreateDreaEntry,
  useDeleteDreaEntry,
  useDreaEntries,
  useDreaSummary,
  type DreaBucket,
  type DreaEntry,
  type DreaEntryType,
  type DreaPeriod,
} from '../hooks/useDrea';

const PERIOD_LABELS: Record<DreaPeriod, string> = {
  month: 'This month',
  year: 'This year',
  all: 'All time',
};

function todayIsoDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function DreaPage() {
  const [period, setPeriod] = useState<DreaPeriod>('month');
  const [type, setType] = useState<DreaEntryType>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [pendingDelete, setPendingDelete] = useState<DreaEntry | null>(null);

  const summary = useDreaSummary();
  const list = useDreaEntries(period);
  const { mutate: createEntry, isPending: isCreating } = useCreateDreaEntry();
  const { mutate: deleteEntry } = useDeleteDreaEntry();

  const entries = useMemo<DreaEntry[]>(() => list.data ?? [], [list.data]);

  const bucket: DreaBucket | undefined = useMemo(() => {
    if (!summary.data) return undefined;
    if (period === 'month') return summary.data.month;
    if (period === 'year') return summary.data.year;
    return summary.data.all;
  }, [summary.data, period]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = description.trim();
    const numericAmount = Number.parseFloat(amount);
    if (!trimmed) {
      toast.error('Description is required.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    if (!date) {
      toast.error('Pick a date.');
      return;
    }

    createEntry(
      { type, description: trimmed, amount: numericAmount, date },
      {
        onSuccess: () => {
          toast.success(type === 'income' ? 'Income added' : 'Expense added');
          setDescription('');
          setAmount('');
          setDate(todayIsoDate());
        },
        onError: (e: unknown) => toast.error((e as Error).message),
      },
    );
  }

  function confirmDelete(): Promise<void> {
    return new Promise((resolve) => {
      if (!pendingDelete?.id) {
        resolve();
        return;
      }
      deleteEntry(pendingDelete.id, {
        onSuccess: () => {
          toast.success('Entry deleted');
          resolve();
        },
        onError: (e: unknown) => {
          toast.error((e as Error).message);
          resolve();
        },
      });
    });
  }

  const columns = useMemo<Column<DreaEntry>[]>(
    () => [
      {
        key: 'date',
        header: 'Date',
        sortable: true,
        sortValue: (e) => e.date ?? '',
        cell: (e) => (
          <span className="tabular-nums text-sm">{e.date ? formatDate(e.date) : '—'}</span>
        ),
        className: 'w-32',
      },
      {
        key: 'description',
        header: 'Description',
        cell: (e) => <span className="text-sm">{e.description}</span>,
      },
      {
        key: 'type',
        header: 'Type',
        sortable: true,
        sortValue: (e) => e.type,
        cell: (e) => (
          <span
            className={
              e.type === 'income'
                ? 'text-xs font-medium uppercase tracking-wider text-emerald-700'
                : 'text-xs font-medium uppercase tracking-wider text-muted-foreground'
            }
          >
            {e.type === 'income' ? 'Income' : 'Expense'}
          </span>
        ),
        className: 'w-28',
      },
      {
        key: 'amount',
        header: 'Amount',
        sortable: true,
        // Sort by signed value so income and expenses separate cleanly.
        sortValue: (e) => (e.type === 'income' ? e.amountCents : -e.amountCents),
        cell: (e) => (
          <span
            className={
              e.type === 'income'
                ? 'tabular-nums font-medium text-emerald-700'
                : 'tabular-nums font-medium'
            }
          >
            {e.type === 'income' ? '+' : '−'}
            {formatUsd(e.amount)}
          </span>
        ),
        className: 'w-32 text-right',
      },
      {
        key: 'actions',
        header: '',
        cell: (e) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setPendingDelete(e);
            }}
            aria-label={`Delete ${e.description}`}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        ),
        className: 'w-12',
      },
    ],
    [],
  );

  const net = bucket?.net ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">Drea Hair</h2>
          <p className="text-sm text-muted-foreground">
            Nothing here touches EVOQ revenue or expenses
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as DreaPeriod)}>
          <TabsList>
            <TabsTrigger value="month">{PERIOD_LABELS.month}</TabsTrigger>
            <TabsTrigger value="year">{PERIOD_LABELS.year}</TabsTrigger>
            <TabsTrigger value="all">{PERIOD_LABELS.all}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI row — income, expenses, net for selected period */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summary.isLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard label="Income" value={formatUsd(bucket?.income ?? 0)} />
            <KpiCard label="Expenses" value={formatUsd(bucket?.expense ?? 0)} />
            <KpiCard
              label="Net"
              value={`${net < 0 ? '−' : ''}${formatUsd(Math.abs(net))}`}
            />
          </>
        )}
      </div>

      {/* Add entry form — the income/expense toggle drives the whole row */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as DreaEntryType)}>
            <TabsList>
              <TabsTrigger value="expense">Add expense</TabsTrigger>
              <TabsTrigger value="income">Add income</TabsTrigger>
            </TabsList>
          </Tabs>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-6 space-y-1.5">
              <Label htmlFor="drea-description">Description</Label>
              <Input
                id="drea-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="PHAT bag of ruber"
                maxLength={500}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="drea-amount">Amount</Label>
              <Input
                id="drea-amount"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="drea-date">Date</Label>
              <Input
                id="drea-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isCreating} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {isCreating
                  ? 'Adding…'
                  : type === 'income'
                    ? 'Add income'
                    : 'Add expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Combined ledger for the active period */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            {PERIOD_LABELS[period]} · {entries.length} entr
            {entries.length === 1 ? 'y' : 'ies'}
          </h3>
        </div>
        {list.isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <DataTable
            rows={entries}
            columns={columns}
            rowKey={(e) => e.id}
            empty={
              <EmptyState
                icon={Scissors}
                title="Nothing logged yet"
                description="Add Drea's first income or expense above."
              />
            }
          />
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => {
          if (!v) setPendingDelete(null);
        }}
        title="Delete entry?"
        description={
          pendingDelete
            ? `"${pendingDelete.description}" for ${formatUsd(pendingDelete.amount)} will be permanently removed.`
            : undefined
        }
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-28" />
      </CardContent>
    </Card>
  );
}
