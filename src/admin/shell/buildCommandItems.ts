import type { Order, Product, Promo } from '../types';

export type CommandItem = {
  id: string;
  label: string;
  /** Free-text extras used by cmdk for fuzzy matching (e.g. sku, email). */
  keywords?: string[];
  to: string;
  group: 'Navigation' | 'Products' | 'Orders' | 'Promos';
};

export const NAV_ITEMS: CommandItem[] = [
  { id: 'nav-dashboard', label: 'Go to Dashboard', to: '/admin/dashboard', group: 'Navigation' },
  { id: 'nav-orders', label: 'Go to Orders', to: '/admin/orders', group: 'Navigation' },
  { id: 'nav-products', label: 'Go to Products', to: '/admin/products', group: 'Navigation' },
  { id: 'nav-promos', label: 'Go to Promos', to: '/admin/promos', group: 'Navigation' },
  { id: 'nav-analytics', label: 'Go to Analytics', to: '/admin/analytics', group: 'Navigation' },
];

/**
 * Build the dynamic half of the command palette list from loaded data.
 *
 * Returns a new array per call — items are keyed by `group` so the palette UI
 * can render them under grouped headings.
 */
export function buildCommandItems(input: {
  products?: Product[];
  orders?: Order[];
  promos?: Promo[];
  /** Max per section. Defaults to 20 — enough for sensible navigation without
   *  overwhelming cmdk's fuzzy matcher on a big catalog. */
  limit?: number;
}): CommandItem[] {
  const { products = [], orders = [], promos = [], limit = 20 } = input;
  const items: CommandItem[] = [];

  for (const p of products.slice(0, limit)) {
    if (!p.sku) continue;
    items.push({
      id: `product-${p.sku}`,
      label: `Edit ${p.name || p.sku}`,
      keywords: [p.sku, p.name ?? ''],
      to: `/admin/products?sku=${encodeURIComponent(p.sku)}`,
      group: 'Products',
    });
  }

  for (const o of orders.slice(0, limit)) {
    if (!o.orderNumber) continue;
    items.push({
      id: `order-${o.orderNumber}`,
      label: `Open order #${o.orderNumber}`,
      keywords: [
        o.orderNumber,
        o.customer?.name ?? '',
        o.customer?.email ?? '',
      ],
      to: `/admin/orders/${o.orderNumber}`,
      group: 'Orders',
    });
  }

  for (const pr of promos.slice(0, limit)) {
    if (!pr.code) continue;
    items.push({
      id: `promo-${pr.code}`,
      label: `Edit ${pr.code}`,
      keywords: [pr.code, pr.description ?? ''],
      // TODO(phase-8): implement PromosPage ?code= deep-link to pre-open drawer.
      to: `/admin/promos?code=${encodeURIComponent(pr.code)}`,
      group: 'Promos',
    });
  }

  return items;
}
