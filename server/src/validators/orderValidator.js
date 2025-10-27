import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(100)
});

const customerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  address: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(100),
  zip: z.string().min(3).max(20)
});

const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  customer: customerSchema,
  promoCode: z.string().trim().toUpperCase().optional()
});

export function validateOrderPayload(payload) {
  return orderSchema.parse(payload);
}
