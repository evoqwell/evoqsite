import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusChip, STATUS_LABELS } from '../components/StatusChip';
import {
  useDeleteOrder,
  useOrder,
  useUpdateOrderStatus,
} from '../hooks/useOrders';
import { formatCurrencyCents, formatDateTime } from '../lib/fmt';
import type { OrderStatus } from '../types';

const STATUS_OPTIONS: OrderStatus[] = [
  'pending_payment',
  'paid',
  'fulfilled',
  'cancelled',
];

type ApiError = Error & { status?: number };

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, error } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  const notFound = (error as ApiError | null)?.status === 404;
  if (!order || notFound) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="font-medium">Order not found</div>
            <p className="text-sm text-muted-foreground">
              We couldn't find order #{id}.
            </p>
            <Button asChild variant="outline">
              <Link to="/admin/orders">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to orders
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleStatusChange(next: OrderStatus) {
    if (!order) return;
    try {
      await updateStatus.mutateAsync({
        orderNumber: order.orderNumber,
        status: next,
      });
      toast.success(
        `Marked as ${STATUS_LABELS[next]?.toLowerCase() ?? next}`
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete() {
    if (!order) return;
    try {
      await deleteOrder.mutateAsync(order.orderNumber);
      toast.success('Order deleted');
      navigate('/admin/orders', { replace: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const { customer, totals, items, promoCode, venmoNote, status, createdAt } =
    order;
  const discountCents = totals?.discountCents ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="space-y-3">
        <Link
          to="/admin/orders"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to orders
        </Link>
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-mono font-semibold">
            #{order.orderNumber}
          </h1>
          <StatusChip status={status} />
          <div className="text-sm text-muted-foreground">
            Placed {formatDateTime(createdAt)}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={status}
              onValueChange={handleStatusChange}
              disabled={updateStatus.isPending}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left (main) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Line items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-16 text-right">Qty</TableHead>
                    <TableHead className="w-28 text-right">Unit price</TableHead>
                    <TableHead className="w-28 text-right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i, idx) => (
                    <TableRow key={`${i.sku}-${idx}`}>
                      <TableCell className="font-mono text-xs">
                        {i.sku}
                      </TableCell>
                      <TableCell>{i.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {i.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrencyCents(i.priceCents)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrencyCents(i.lineTotalCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums">
                    {formatCurrencyCents(totals?.subtotalCents)}
                  </dd>
                </div>
                {discountCents > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <dt className="text-muted-foreground">
                      Discount
                      {promoCode && (
                        <span className="ml-2 font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                          {promoCode}
                        </span>
                      )}
                    </dt>
                    <dd className="tabular-nums text-emerald-700">
                      -{formatCurrencyCents(discountCents)}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className="tabular-nums">
                    {formatCurrencyCents(totals?.shippingCents)}
                  </dd>
                </div>
                <div className="border-t pt-2 flex items-center justify-between">
                  <dt className="font-semibold">Total</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {formatCurrencyCents(totals?.totalCents)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Right (aside) */}
        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="font-medium">{customer?.name ?? '—'}</div>
              {customer?.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="text-brand-brown hover:underline break-all"
                >
                  {customer.email}
                </a>
              ) : (
                <div className="text-muted-foreground">No email on file</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Shipping address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-0.5">
              {customer?.address ? (
                <>
                  <div>{customer.address}</div>
                  <div>
                    {[customer.city, customer.state].filter(Boolean).join(', ')}
                    {customer.zip ? ` ${customer.zip}` : ''}
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">—</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {venmoNote ? (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Venmo note
                  </div>
                  <div className="font-mono">{venmoNote}</div>
                </div>
              ) : (
                <div className="text-muted-foreground">—</div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete order"
        description={
          <>
            This permanently deletes order{' '}
            <code className="font-mono">#{order.orderNumber}</code>. This action
            cannot be undone.
          </>
        }
        confirmText="Delete order"
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
