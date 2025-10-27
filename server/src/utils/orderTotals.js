import { centsToDollars } from './money.js';

export function calculateOrderTotals({ cartItems, shippingCents = 0, promo }) {
  const subtotalCents = cartItems.reduce((sum, item) => {
    return sum + item.product.priceCents * item.quantity;
  }, 0);

  const effectiveShipping = subtotalCents > 0 ? shippingCents : 0;

  let discountCents = 0;
  if (promo) {
    if (promo.discountType === 'percentage') {
      discountCents = Math.round(subtotalCents * (promo.discountValue / 100));
    } else if (promo.discountType === 'fixed') {
      discountCents = Math.round(promo.discountValue * 100);
    }

    if (discountCents > subtotalCents) {
      discountCents = subtotalCents;
    }
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
