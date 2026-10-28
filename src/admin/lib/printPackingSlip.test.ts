import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '../types';
import { printPackingSlip } from './printPackingSlip';

const order: Order = {
  orderNumber: 'EVOQ-20261028-ABCD',
  status: 'paid',
  createdAt: '2026-10-28T18:00:00.000Z',
  promoCodes: ['SAVE10', 'FRIEND5'],
  customer: {
    name: 'Test Customer',
    address: '123 Main St',
    city: 'Reno',
    state: 'NV',
    zip: '89501',
  },
  items: [
    { sku: 'BPC-157', name: 'BPC-157', quantity: 2, priceCents: 5000, lineTotalCents: 10000 },
  ],
  totals: { subtotalCents: 10000, discountCents: 1500, shippingCents: 1000, totalCents: 9500 },
};

/** Captures the HTML the slip writes into its popup window. */
function captureSlip(target: Order): string {
  let html = '';
  vi.spyOn(window, 'open').mockReturnValue({
    document: { write: (chunk: string) => (html += chunk), close: () => {} },
  } as unknown as Window);
  printPackingSlip(target);
  return html;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('printPackingSlip', () => {
  it('shows the subtotal and a discount line naming every code', () => {
    const html = captureSlip(order);

    expect(html).toMatch(/Subtotal<\/span>\s*<span>\$100\.00/);
    expect(html).toMatch(/Discount \(SAVE10, FRIEND5\)<\/span>\s*<span>-\$15\.00/);
    expect(html).toMatch(/Order Total<\/span>\s*<span>\$95\.00/);
  });

  it('leaves out the discount lines when the order had none', () => {
    const html = captureSlip({
      ...order,
      promoCodes: [],
      totals: { subtotalCents: 10000, discountCents: 0, shippingCents: 1000, totalCents: 11000 },
    });

    expect(html).not.toContain('Discount');
    expect(html).not.toContain('Subtotal');
  });
});
