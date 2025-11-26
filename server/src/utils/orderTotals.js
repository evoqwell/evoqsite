import { centsToDollars } from './money.js';

export function calculateOrderTotals({ cartItems, shippingCents = 0, promo, promos = [] }) {
  const subtotalCents = cartItems.reduce((sum, item) => {
    return sum + item.product.priceCents * item.quantity;
  }, 0);

  const effectiveShipping = subtotalCents > 0 ? shippingCents : 0;

  // Support both single promo (backward compat) and promos array
  const promoList = promos.length > 0 ? promos : (promo ? [promo] : []);

  let discountCents = 0;
  // Each promo applies to BASE subtotal (not compounding)
  for (const p of promoList) {
    if (p.discountType === 'percentage') {
      discountCents += Math.round(subtotalCents * (p.discountValue / 100));
    } else if (p.discountType === 'fixed') {
      discountCents += Math.round(p.discountValue * 100);
    }
  }

  // Cap total discount at subtotal
  if (discountCents > subtotalCents) {
    discountCents = subtotalCents;
  }

  const totalCents = subtotalCents - discountCents + effectiveShipping;

  return {
    subtotalCents,
    discountCents,
    shippingCents: effectiveShipping,
    totalCents,
    toJSON() {
      return {
        subtotal: centsToDollars(subtotalCents),
        discount: centsToDollars(discountCents),
        shipping: centsToDollars(effectiveShipping),
        total: centsToDollars(totalCents)
      };
    }
  };
}
