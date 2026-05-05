import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminExpense,
  deleteAdminExpense,
  fetchAdminExpenses,
  fetchAdminExpenseSummary,
} from '../../../lib/adminApi.js';

export type ExpensePeriod = 'month' | 'year' | 'all';

export type Expense = {
  id: string;
  description: string;
  amount: number;
  amountCents: number;
  date: string;
  createdAt: string;
};

export type ExpenseBucket = {
  expense: number;
  expenseCents: number;
  revenue: number;
  revenueCents: number;
  grossProfit: number;
  grossProfitCents: number;
  expenseCount: number;
  orderCount: number;
  startDate?: string;
};

export type ExpenseSummary = {
  asOf: string;
  month: ExpenseBucket;
  year: ExpenseBucket;
  all: ExpenseBucket;
};

type RawExpense = Partial<Expense>;

export function useExpenses(period: ExpensePeriod = 'all') {
  return useQuery({
    queryKey: ['expenses', { period }],
    queryFn: () => fetchAdminExpenses(null, { period }),
    staleTime: 30_000,
    select: (data: unknown): Expense[] => {
      const raw = (data as { expenses?: RawExpense[] } | null)?.expenses ?? [];
      return raw.map((e) => ({
        id: e.id ?? '',
        description: e.description ?? '',
        amount: e.amount ?? 0,
        amountCents: e.amountCents ?? Math.round((e.amount ?? 0) * 100),
        date: e.date ?? '',
        createdAt: e.createdAt ?? '',
      }));
    },
  });
}

export function useExpenseSummary() {
  return useQuery({
    queryKey: ['expenses', 'summary'],
    queryFn: () => fetchAdminExpenseSummary(null),
    staleTime: 30_000,
    select: (data: unknown): ExpenseSummary => {
      const raw = (data ?? {}) as Partial<ExpenseSummary>;
      const empty: ExpenseBucket = {
        expense: 0,
        expenseCents: 0,
        revenue: 0,
        revenueCents: 0,
        grossProfit: 0,
        grossProfitCents: 0,
        expenseCount: 0,
        orderCount: 0,
      };
      return {
        asOf: raw.asOf ?? '',
        month: { ...empty, ...(raw.month ?? {}) },
        year: { ...empty, ...(raw.year ?? {}) },
        all: { ...empty, ...(raw.all ?? {}) },
      };
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { description: string; amount: number; date: string }) =>
      createAdminExpense(null, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminExpense(null, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
