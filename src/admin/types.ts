// Shared admin-area TypeScript types.
//
// Kept intentionally lightweight — mirrors what the admin API actually puts on
// the wire. Fields are optional where the server may omit them so consumers
// must guard reads.

export type ProductStatus = 'active' | 'coming_soon' | 'inactive';

export type Product = {
  sku: string;
  name: string;
  description?: string;
  /** Price in dollars (float) as returned by the admin API. */
  price?: number;
  image?: string;
  categories?: string[];
  category?: string;
  coa?: string;
  stock?: number;
  status?: ProductStatus | string;
};

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'fulfilled'
  | 'cancelled';

export type Order = {
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  promoCode?: string | null;
  venmoNote?: string;
  customer?: {
    name?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    price?: number;
    priceCents: number;
    lineTotal?: number;
    lineTotalCents: number;
  }>;
  totals: {
    subtotal?: number;
    discount?: number;
    shipping?: number;
    total?: number;
    subtotalCents: number;
    discountCents: number;
    shippingCents: number;
    totalCents: number;
  };
};

export type PromoDiscountType = 'percentage' | 'fixed';

export type Promo = {
  code: string;
  discountType: PromoDiscountType;
  discountValue: number;
  description?: string;
  isActive?: boolean;
};
