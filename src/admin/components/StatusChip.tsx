import { cn } from '@/lib/utils';

const VARIANTS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  coming_soon: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-600/20',

  pending_payment: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  paid: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  fulfilled: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  coming_soon: 'Coming soon',
  inactive: 'Inactive',
  pending_payment: 'Pending payment',
  paid: 'Paid',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

export function StatusChip({ status }: { status: string }) {
  const cls = VARIANTS[status] ?? 'bg-slate-100 text-slate-600 ring-slate-600/20';
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs ring-1 ring-inset',
        cls
      )}
    >
      {label}
    </span>
  );
}
