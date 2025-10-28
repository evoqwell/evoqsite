import { z } from 'zod';

// Enhanced validation with security checks
const orderItemSchema = z.object({
  productId: z.string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9\-]+$/, 'Invalid product ID format'),
  quantity: z.number()
    .int()
    .positive()
    .min(1)
    .max(100, 'Quantity cannot exceed 100')
});

const customerSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .transform(val => val.trim())
    .refine(val => !/[<>'"]/g.test(val), 'Invalid characters in name'),

  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(254, 'Email too long')
    .refine(val => !val.includes('..'), 'Invalid email format'),

  address: z.string()
    .min(5, 'Address too short')
    .max(200, 'Address too long')
    .transform(val => val.trim())
    .refine(val => !/[<>'"]/g.test(val), 'Invalid characters in address'),

  city: z.string()
    .min(2, 'City too short')
    .max(100, 'City too long')
    .transform(val => val.trim())
    .refine(val => !/[<>'"]/g.test(val), 'Invalid characters in city'),

  state: z.string()
    .min(2, 'State too short')
    .max(100, 'State too long')
    .transform(val => val.trim()),

  zip: z.string()
    .min(3, 'ZIP code too short')
    .max(20, 'ZIP code too long')
    .regex(/^[\d\-\s]+$/, 'Invalid ZIP code format')
    .transform(val => val.trim())
});

const orderSchema = z.object({
  items: z.array(orderItemSchema)
    .min(1, 'At least one item required')
    .max(50, 'Too many items in order'),

  customer: customerSchema,

  promoCode: z.string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_\-]{0,20}$/, 'Invalid promo code format')
    .optional()
});

export function validateOrderPayload(payload) {
  // Additional security checks before parsing
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid order payload');
  }

  // Check for suspicious payload size
  const payloadString = JSON.stringify(payload);
  if (payloadString.length > 50000) {
    throw new Error('Order payload too large');
  }

  return orderSchema.parse(payload);
}

/**
 * Validates that cart items haven't been tampered with
 * @param {Array} cartItems - Items from the client
 * @param {Array} products - Products from database
 * @returns {boolean} True if valid
 */
export function validateCartIntegrity(cartItems, products) {
  const productMap = new Map(products.map(p => [p.sku, p]));

  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      return false;
    }

    // Ensure the product is active
    if (!product.isActive) {
      return false;
    }

    // Check stock if applicable
    if (typeof product.stock === 'number' && product.stock < item.quantity) {
      return false;
    }
  }

  return true;
}
