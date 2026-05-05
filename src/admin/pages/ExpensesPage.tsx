import { useMemo, useState } from 'react';
import { Plus, Receipt, Trash2 } from 'lucide-react';
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
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  useExpenseSummary,
  type Expense,
  type ExpenseBucket,
  type ExpensePeriod,
} from '../hooks/useExpenses';

const PERIOD_LABELS: Record<ExpensePeriod, string> = {
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

export function ExpensesPage() {
  const [period, setPeriod] = useState<ExpensePeriod>('month');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);

  const summary = useExpenseSummary();
  const list = useExpenses(period);
  const { mutate: createExpense, isPending: isCreating } = useCreateExpense();
  const { mutate: deleteExpense } = useDeleteExpense();

  const expenses = useMemo<Expense[]>(() => list.data ?? [], [list.data]);

  const bucket: ExpenseBucket | undefined = useMemo(() => {
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

    createExpense(
      { description: trimmed, amount: numericAmount, date },
      {
        onSuccess: () => {
          toast.success('Expense added');
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
      deleteExpense(pendingDelete.id, {
        onSuccess: () => {
          toast.success('Expense deleted');
          resolve();
        },
        onError: (e: unknown) => {
          toast.error((e as Error).message);
          resolve();
        },
      });
    });
  }

  const columns = useMemo<Column<Expense>[]>(
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
        key: 'amount',
        header: 'Amount',
        sortable: true,
        sortValue: (e) => e.amountCents ?? 0,
        cell: (e) => (
          <span className="tabular-nums font-medium">{formatUsd(e.amount)}</span>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">Expenses</h2>
          <p className="text-sm text-muted-foreground">
            Track expenses and compare to revenue for gross profit.
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as ExpensePeriod)}>
          <TabsList>
            <TabsTrigger value="month">{PERIOD_LABELS.month}</TabsTrigger>
            <TabsTrigger value="year">{PERIOD_LABELS.year}</TabsTrigger>
            <TabsTrigger value="all">{PERIOD_LABELS.all}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI row — revenue, expenses, gross profit for selected period */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summary.isLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard label="Revenue" value={formatUsd(bucket?.revenue ?? 0)} />
            <KpiCard label="Expenses" value={formatUsd(bucket?.expense ?? 0)} />
            <KpiCard
              label="Gross profit"
              value={formatUsd(bucket?.grossProfit ?? 0)}
            />
          </>
        )}
      </div>

      {/* Add expense form */}
      <Card>
        <CardContent className="p-5">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-6 space-y-1.5">
              <Label htmlFor="expense-description">Description</Label>
              <Input
                id="expense-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. FAT bag of paht"
                maxLength={500}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="expense-amount">Amount</Label>
              <Input
                id="expense-amount"
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
              <Label htmlFor="expense-date">Date</Label>
              <Input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isCreating} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {isCreating ? 'Adding…' : 'Add expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Expense list for the active period */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            {PERIOD_LABELS[period]} · {expenses.length} expense
            {expenses.length === 1 ? '' : 's'}
          </h3>
        </div>
        {list.isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <DataTable
            rows={expenses}
            columns={columns}
            rowKey={(e) => e.id}
            empty={
              <EmptyState
                icon={Receipt}
                title="No expenses yet"
                description="Add your first expense above."
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
        title="Delete expense?"
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
