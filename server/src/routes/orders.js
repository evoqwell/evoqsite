import { Router } from 'express';
import { Product } from '../models/Product.js';
import { PromoCode } from '../models/PromoCode.js';
import { Order } from '../models/Order.js';
import { validateOrderPayload } from '../validators/orderValidator.js';
import { calculateOrderTotals } from '../utils/orderTotals.js';
import { config } from '../config/env.js';
import { sendOrderEmails } from '../services/emailService.js';
import { centsToDollars } from '../utils/money.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const payload = validateOrderPayload(req.body);

    const uniqueProductIds = [...new Set(payload.items.map((item) => item.productId))];
    const products = await Product.find({ sku: { $in: uniqueProductIds }, isActive: true }).lean();

    if (products.length !== uniqueProductIds.length) {
      return res.status(400).json({ error: 'One or more products are unavailable.' });
    }

    const productMap = new Map(products.map((product) => [product.sku, product]));
    const cartItems = payload.items.map((item) => ({
      product: productMap.get(item.productId),
      quantity: item.quantity
    }));

    let promo = null;
    if (payload.promoCode) {
      const promoDoc = await PromoCode.findOne({ code: payload.promoCode, isActive: true }).lean();
      if (!promoDoc) {
        return res.status(400).json({ error: 'Promo code is invalid or inactive.' });
      }
      promo = promoDoc;
    }

    const totals = calculateOrderTotals({
      cartItems,
      shippingCents: config.shippingFlatRateCents,
      promo
    });

    const orderNumber = generateOrderNumber();
    const venmoNote = orderNumber;
    const venmoUrl = buildVenmoUrl({
      username: config.venmoUsername,
      amount: centsToDollars(totals.totalCents),
      note: venmoNote
    });

    const orderItems = cartItems.map((item) => ({
      sku: item.product.sku,
      name: item.product.name,
      priceCents: item.product.priceCents,
      quantity: item.quantity,
      lineTotalCents: item.product.priceCents * item.quantity
    }));

    const order = await Order.create({
      orderNumber,
      promoCode: promo?.code,
      venmoNote,
      items: orderItems,
      totals: {
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        shippingCents: totals.shippingCents,
        totalCents: totals.totalCents
      },
      customer: {
        name: payload.customer.name,
        email: payload.customer.email,
        address: payload.customer.address,
        city: payload.customer.city,
        state: payload.customer.state,
        zip: payload.customer.zip
      }
    });

    sendOrderEmails(order, { venmoUrl }).catch((err) => {
      console.error('[email] Failed to send confirmation emails', err);
    });

    res.status(201).json({
      orderNumber,
      venmoUrl,
      promoCode: promo?.code || null,
      totals: totals.toJSON(),
      items: orderItems.map((item) => ({
        id: item.sku,
        name: item.name,
        quantity: item.quantity,
        price: centsToDollars(item.priceCents),
        lineTotal: centsToDollars(item.lineTotalCents)
      })),
      customer: {
        name: payload.customer.name,
        email: payload.customer.email,
        address: payload.customer.address,
        city: payload.customer.city,
        state: payload.customer.state,
        zip: payload.customer.zip
      }
    });
  } catch (error) {
    next(error);
  }
});

function generateOrderNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `EVOQ-${datePart}-${randomPart}`;
}

function buildVenmoUrl({ username, amount, note }) {
  const base = `https://venmo.com/${encodeURIComponent(username)}`;
  const params = new URLSearchParams({
    txn: 'pay',
    amount: amount.toFixed(2),
    note
  });
  return `${base}?${params.toString()}`;
}

export default router;
