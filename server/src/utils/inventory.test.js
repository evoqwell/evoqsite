import { describe, it, expect } from 'vitest';
import { reserveStock, releaseStock, toStockLines } from './inventory.js';

// Stands in for the Product model with just the two operations the inventory
// helpers use. Mirrors Mongo's semantics for `$gte` guards and `$inc` so the
// rollback path can be exercised without a database.
function fakeProductModel(initialStock) {
  const stock = new Map(Object.entries(initialStock));

  return {
    stock,
    findOneAndUpdate(filter, update) {
      const current = stock.get(filter.sku);
      const required = filter.stock.$gte;
      const chain = { lean: async () => null };

      if (current === undefined || current < required) return chain;

      const next = current + update.$inc.stock;
      stock.set(filter.sku, next);
      return { lean: async () => ({ sku: filter.sku, stock: next }) };
    },
    async updateOne(filter, update) {
      const current = stock.get(filter.sku);
      if (current === undefined) return { matchedCount: 0 };
      stock.set(filter.sku, current + update.$inc.stock);
      return { matchedCount: 1 };
    }
  };
}

describe('reserveStock', () => {
  it('decrements every line when all have enough stock', async () => {
    const model = fakeProductModel({ 'sku-a': 10, 'sku-b': 5 });

    const result = await reserveStock(
      [
        { sku: 'sku-a', quantity: 3 },
        { sku: 'sku-b', quantity: 5 }
      ],
      { model }
    );

    expect(result).toEqual({ ok: true });
    expect(model.stock.get('sku-a')).toBe(7);
    expect(model.stock.get('sku-b')).toBe(0);
  });

  it('rolls back earlier lines when a later line is short', async () => {
    const model = fakeProductModel({ 'sku-a': 10, 'sku-b': 1 });

    const result = await reserveStock(
      [
        { sku: 'sku-a', quantity: 3 },
        { sku: 'sku-b', quantity: 2 }
      ],
      { model }
    );

    expect(result).toEqual({ ok: false, sku: 'sku-b' });
    expect(model.stock.get('sku-a')).toBe(10);
    expect(model.stock.get('sku-b')).toBe(1);
  });

  it('reports the missing sku and leaves stock untouched', async () => {
    const model = fakeProductModel({ 'sku-a': 10 });

    const result = await reserveStock(
      [
        { sku: 'sku-a', quantity: 1 },
        { sku: 'sku-gone', quantity: 1 }
      ],
      { model }
    );

    expect(result).toEqual({ ok: false, sku: 'sku-gone' });
    expect(model.stock.get('sku-a')).toBe(10);
  });

  it('lets only one of two concurrent buyers take the last unit', async () => {
    const model = fakeProductModel({ 'sku-a': 1 });
    const line = [{ sku: 'sku-a', quantity: 1 }];

    const [first, second] = await Promise.all([
      reserveStock(line, { model }),
      reserveStock(line, { model })
    ]);

    expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1);
    expect(model.stock.get('sku-a')).toBe(0);
  });
});

describe('releaseStock', () => {
  it('adds quantities back', async () => {
    const model = fakeProductModel({ 'sku-a': 2 });

    await releaseStock([{ sku: 'sku-a', quantity: 3 }], { model });

    expect(model.stock.get('sku-a')).toBe(5);
  });

  it('skips a sku that no longer exists without throwing', async () => {
    const model = fakeProductModel({ 'sku-a': 2 });

    await releaseStock(
      [
        { sku: 'sku-gone', quantity: 1 },
        { sku: 'sku-a', quantity: 1 }
      ],
      { model }
    );

    expect(model.stock.get('sku-a')).toBe(3);
  });
});

describe('toStockLines', () => {
  it('strips order item fields down to sku and quantity', () => {
    expect(
      toStockLines([{ sku: 'sku-a', name: 'A', priceCents: 100, quantity: 2, lineTotalCents: 200 }])
    ).toEqual([{ sku: 'sku-a', quantity: 2 }]);
  });
});
