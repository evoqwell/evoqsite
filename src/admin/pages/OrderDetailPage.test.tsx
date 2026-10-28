import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Order } from '../types';
import { OrderDetailPage } from './OrderDetailPage';

const order: Order = {
  orderNumber: 'EVOQ-20261028-ABCD',
  status: 'paid',
  createdAt: '2026-10-28T18:00:00.000Z',
  promoCodes: ['SAVE10', 'FRIEND5'],
  paymentMethod: 'venmo',
  customer: { name: 'Test Customer', email: 'test@example.com' },
  items: [
    { sku: 'BPC-157', name: 'BPC-157', quantity: 2, priceCents: 5000, lineTotalCents: 10000 },
  ],
  totals: { subtotalCents: 10000, discountCents: 1500, shippingCents: 1000, totalCents: 9500 },
};

vi.mock('../hooks/useOrders', () => {
  const mutation = { isPending: false, mutateAsync: vi.fn() };
  return {
    useOrder: () => ({ data: order, isLoading: false, error: null }),
    useUpdateOrderStatus: () => mutation,
    useDeleteOrder: () => mutation,
    useMarkInvoiceSent: () => mutation,
  };
});

describe('OrderDetailPage', () => {
  it('shows every promo code next to the discount', () => {
    render(
      <MemoryRouter initialEntries={[`/admin/orders/${order.orderNumber}`]}>
        <Routes>
          <Route path="/admin/orders/:id" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('SAVE10')).toBeInTheDocument();
    expect(screen.getByText('FRIEND5')).toBeInTheDocument();
  });
});
