import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminDreaEntry,
  deleteAdminDreaEntry,
  fetchAdminDreaEntries,
  fetchAdminDreaSummary,
} from '../../../lib/adminApi.js';

export type DreaPeriod = 'month' | 'year' | 'all';
export type DreaEntryType = 'income' | 'expense';

export type DreaEntry = {
  id: string;
  type: DreaEntryType;
  description: string;
  /** Always positive — the sign is implied by `type`. */
  amount: number;
  amountCents: number;
  date: string;
  createdAt: string;
};

export type DreaBucket = {
  income: number;
  incomeCents: number;
  expense: number;
  expenseCents: number;
  net: number;
  netCents: number;
  incomeCount: number;
  expenseCount: number;
  startDate?: string;
};

export type DreaSummary = {
  asOf: string;
  month: DreaBucket;
  year: DreaBucket;
  all: DreaBucket;
};

type RawDreaEntry = Partial<DreaEntry>;

const EMPTY_BUCKET: DreaBucket = {
  income: 0,
  incomeCents: 0,
  expense: 0,
  expenseCents: 0,
  net: 0,
  netCents: 0,
  incomeCount: 0,
  expenseCount: 0,
};

export function useDreaEntries(period: DreaPeriod = 'all') {
  return useQuery({
    queryKey: ['drea', { period }],
    queryFn: () => fetchAdminDreaEntries(null, { period }),
    staleTime: 30_000,
    select: (data: unknown): DreaEntry[] => {
      const raw = (data as { entries?: RawDreaEntry[] } | null)?.entries ?? [];
      return raw.map((e) => ({
        id: e.id ?? '',
        type: e.type === 'income' ? 'income' : 'expense',
        description: e.description ?? '',
        amount: e.amount ?? 0,
        amountCents: e.amountCents ?? Math.round((e.amount ?? 0) * 100),
        date: e.date ?? '',
        createdAt: e.createdAt ?? '',
      }));
    },
  });
}

export function useDreaSummary() {
  return useQuery({
    queryKey: ['drea', 'summary'],
    queryFn: () => fetchAdminDreaSummary(null),
    staleTime: 30_000,
    select: (data: unknown): DreaSummary => {
      const raw = (data ?? {}) as Partial<DreaSummary>;
      return {
        asOf: raw.asOf ?? '',
        month: { ...EMPTY_BUCKET, ...(raw.month ?? {}) },
        year: { ...EMPTY_BUCKET, ...(raw.year ?? {}) },
        all: { ...EMPTY_BUCKET, ...(raw.all ?? {}) },
      };
    },
  });
}

export function useCreateDreaEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      type: DreaEntryType;
      description: string;
      amount: number;
      date: string;
    }) => createAdminDreaEntry(null, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drea'] });
    },
  });
}

export function useDeleteDreaEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdminDreaEntry(null, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drea'] });
    },
  });
}
