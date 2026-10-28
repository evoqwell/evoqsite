/**
 * Every promo code used on an order. Orders placed before codes could stack
 * (Nov 2025) only have the single `promoCode` field; newer orders keep the
 * full list in `promoCodes` and mirror the first entry into `promoCode`.
 */
export function getOrderPromoCodes(order) {
  if (order.promoCodes?.length) return order.promoCodes;
  return order.promoCode ? [order.promoCode] : [];
}
