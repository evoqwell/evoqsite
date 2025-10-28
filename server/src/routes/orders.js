import crypto from 'crypto';
import { Router } from 'express';
import { Product } from '../models/Product.js';
import { PromoCode } from '../models/PromoCode.js';
import { Order } from '../models/Order.js';
import { validateOrderPayload } from '../validators/orderValidator.js';
import { calculateOrderTotals } from '../utils/orderTotals.js';
import { config } from '../config/env.js';
import { centsToDollars } from '../utils/money.js';
import { orderLimiter, logSecurityEvent } from '../middleware/security.js';

const router = Router();

router.post('/', orderLimiter, async (req, res, next) => {
  try {
    // Log order attempt for security monitoring
    logSecurityEvent('ORDER_ATTEMPT', {
      ip: req.ip,
      items: req.body.items?.length || 0,
      email: req.body.customer?.email
    }, req);

    const payload = validateOrderPayload(req.body);

    const quantityBySku = new Map();
    for (const item of payload.items) {
      quantityBySku.set(item.productId, (quantityBySku.get(item.productId) || 0) + item.quantity);
    }

    const uniqueProductIds = [...quantityBySku.keys()];
    const products = await Product.find({ sku: { $in: uniqueProductIds }, isActive: true }).lean();

    if (products.length !== uniqueProductIds.length) {
      return res.status(400).json({ error: 'One or more products are unavailable.' });
    }

    const productMap = new Map(products.map((product) => [product.sku, product]));
    const cartItems = [];

    for (const [productId, quantity] of quantityBySku.entries()) {
      const product = productMap.get(productId);
      const stock = typeof product.stock === 'number' ? product.stock : null;

      if (stock !== null) {
        if (stock <= 0) {
          return res.status(400).json({ error: `${product.name} is currently out of stock.` });
        }
        if (quantity > stock) {
          return res
            .status(400)
            .json({ error: `Only ${stock} unit${stock === 1 ? '' : 's'} of ${product.name} are available.` });
        }
      }

      cartItems.push({ product, quantity });
    }

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

    console.log(
      `[orders] Created ${order.orderNumber} (${order.items.length} items, total $${centsToDollars(
        totals.totalCents
      ).toFixed(2)})`
    );

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
    console.error('[orders] Failed to create order', error);
    next(error);
  }
});

function generateOrderNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
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
