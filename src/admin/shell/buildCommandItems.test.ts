import { describe, expect, it } from 'vitest';
import { buildCommandItems } from './buildCommandItems';
import type { Order, Product, Promo } from '../types';

describe('buildCommandItems', () => {
  const product: Product = { sku: 'SKU-1', name: 'Test Peptide' };
  const order: Order = {
    orderNumber: 'EVQ-1001',
    status: 'paid',
    createdAt: '2026-01-01T00:00:00Z',
    customer: { name: 'Alice', email: 'a@example.com' },
    items: [],
    totals: {
      subtotalCents: 0,
      discountCents: 0,
      shippingCents: 0,
      totalCents: 0,
    },
  };
  const promo: Promo = { code: 'SAVE10', discountType: 'percentage', discountValue: 10 };

  it('returns empty list when no data provided', () => {
    expect(buildCommandItems({})).toEqual([]);
  });

  it('includes a product, order, and promo entry with correct routes', () => {
    const items = buildCommandItems({
      products: [product],
      orders: [order],
      promos: [promo],
    });
    expect(items).toHaveLength(3);

    const prod = items.find((i) => i.group === 'Products')!;
    expect(prod.to).toBe('/admin/products?sku=SKU-1');
    expect(prod.label).toContain('Test Peptide');

    const ord = items.find((i) => i.group === 'Orders')!;
    expect(ord.to).toBe('/admin/orders/EVQ-1001');
    expect(ord.keywords).toEqual(
      expect.arrayContaining(['EVQ-1001', 'Alice', 'a@example.com']),
    );

    const pr = items.find((i) => i.group === 'Promos')!;
    expect(pr.to).toBe('/admin/promos?code=SAVE10');
  });

  it('encodes URL-sensitive characters in sku and promo code', () => {
    const items = buildCommandItems({
      products: [{ sku: 'A B/C', name: 'X' }],
      promos: [{ code: 'P&P', discountType: 'fixed', discountValue: 1 }],
    });
    expect(items[0].to).toBe('/admin/products?sku=A%20B%2FC');
    expect(items[1].to).toBe('/admin/promos?code=P%26P');
  });

  it('respects the limit parameter per section', () => {
    const many: Product[] = Array.from({ length: 5 }, (_, i) => ({
      sku: `S${i}`,
      name: `Product ${i}`,
    }));
    const items = buildCommandItems({ products: many, limit: 2 });
    expect(items).toHaveLength(2);
  });

  it('skips products/orders/promos missing their identifier', () => {
    const items = buildCommandItems({
      products: [{ sku: '', name: 'No SKU' } as Product],
      orders: [{ ...order, orderNumber: '' }],
      promos: [{ ...promo, code: '' }],
    });
    expect(items).toEqual([]);
  });
});
