import { Product } from '../models/Product.js';

// Stock moves in exactly two places: an order is placed (reserve) and an order
// is cancelled or deleted (release). Both go through here so the guard against
// overselling lives in one spot.
//
// The guard is the `stock: { $gte: quantity }` filter — the decrement only
// applies if the document still has enough on hand at write time. A plain read
// followed by a write would let two simultaneous buyers of the last unit both
// pass the check.

/**
 * Atomically decrement stock for each line. Lines are `{ sku, quantity }`.
 *
 * Decrements are applied one document at a time, so a later line failing leaves
 * earlier lines already committed — those are rolled back before returning.
 *
 * @returns `{ ok: true }`, or `{ ok: false, sku }` naming the line that failed.
 */
export async function reserveStock(lines, { model = Product } = {}) {
  const reserved = [];

  for (const line of lines) {
    const updated = await model
      .findOneAndUpdate(
        { sku: line.sku, stock: { $gte: line.quantity } },
        { $inc: { stock: -line.quantity } },
        { new: true }
      )
      .lean();

    if (!updated) {
      await releaseStock(reserved, { model });
      return { ok: false, sku: line.sku };
    }

    reserved.push(line);
  }

  return { ok: true };
}

/**
 * Add stock back for each line. Used for rollback, cancellation, and deletion.
 *
 * Best-effort by design: a missing SKU (product deleted after the order was
 * placed) is skipped rather than failing the whole release, so one dead line
 * can't strand the rest of the order's inventory.
 */
export async function releaseStock(lines, { model = Product } = {}) {
  for (const line of lines) {
    await model.updateOne({ sku: line.sku }, { $inc: { stock: line.quantity } });
  }
}

/** Order items carry more fields than the stock helpers need. */
export function toStockLines(items) {
  return items.map((item) => ({ sku: item.sku, quantity: item.quantity }));
}
