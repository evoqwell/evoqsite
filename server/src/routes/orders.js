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
import { encryptCustomerData } from '../utils/encryption.js';
import { anonymizeIpForLog } from '../utils/ipAnonymizer.js';
import { reserveStock, releaseStock, toStockLines } from '../utils/inventory.js';
import { ipReputationMiddleware, emailRateLimitMiddleware } from '../utils/ipReputation.js';

const router = Router();

// Apply security middleware: IP rate limiting, reputation check, email rate limiting
router.post('/', orderLimiter, ipReputationMiddleware, emailRateLimitMiddleware, async (req, res, next) => {
  try {
    // Log order attempt for security monitoring (GDPR: anonymize IP)
    logSecurityEvent('ORDER_ATTEMPT', {
      ip: anonymizeIpForLog(req.ip),
      items: req.body.items?.length || 0,
      email: req.body.customer?.email
    }, req);

    const payload = validateOrderPayload(req.body);

    const quantityBySku = new Map();
    for (const item of payload.items) {
      quantityBySku.set(item.productId, (quantityBySku.get(item.productId) || 0) + item.quantity);
    }

    const uniqueProductIds = [...quantityBySku.keys()];
    const products = await Product.find({ sku: { $in: uniqueProductIds }, status: 'active' }).lean();

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

    // Handle both single promoCode (backward compat) and promoCodes array
    let promos = [];
    const codesToValidate = payload.promoCodes || (payload.promoCode ? [payload.promoCode] : []);

    if (codesToValidate.length > 0) {
      // Check for duplicates in request
      const uniqueCodes = [...new Set(codesToValidate.map(c => c.toUpperCase()))];
      if (uniqueCodes.length !== codesToValidate.length) {
        return res.status(400).json({ error: 'Duplicate promo codes are not allowed.' });
      }

      // Validate all codes exist and are active
      const promoDocs = await PromoCode.find({
        code: { $in: uniqueCodes },
        isActive: true
      }).lean();

      const foundCodes = promoDocs.map(p => p.code);
      const invalidCodes = uniqueCodes.filter(c => !foundCodes.includes(c));

      if (invalidCodes.length > 0) {
        return res.status(400).json({
          error: `Invalid or inactive promo code(s): ${invalidCodes.join(', ')}`
        });
      }

      promos = promoDocs;
    }

    const totals = calculateOrderTotals({
      cartItems,
      shippingCents: config.shippingFlatRateCents,
      promos
    });

    const orderNumber = generateOrderNumber();
    const venmoNote = orderNumber;
    const paymentMethod = payload.paymentMethod ?? 'venmo';
    // Card requests get invoiced manually, so no Venmo affordance is built or
    // returned for them.
    const venmoPayment =
      paymentMethod === 'card'
        ? null
        : buildVenmoPaymentData({
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

    // Encrypt customer PII before storing
    const encryptedCustomer = encryptCustomerData({
      name: payload.customer.name,
      email: payload.customer.email,
      ...(payload.customer.phone ? { phone: payload.customer.phone } : {}),
      address: payload.customer.address,
      city: payload.customer.city,
      state: payload.customer.state,
      zip: payload.customer.zip
    });

    // The stock check above runs against a snapshot read minutes earlier, so it
    // produces good error messages but guarantees nothing. This is the real
    // guard: each decrement only applies if the product still has the units.
    const stockLines = toStockLines(orderItems);
    const reservation = await reserveStock(stockLines);

    if (!reservation.ok) {
      const contested = await Product.findOne({ sku: reservation.sku }).lean();
      const name = contested?.name ?? productMap.get(reservation.sku)?.name ?? 'An item';
      const available = contested?.stock ?? 0;

      logSecurityEvent('ORDER_STOCK_CONFLICT', { sku: reservation.sku, available }, req);

      return res.status(409).json({
        error:
          available > 0
            ? `Only ${available} unit${available === 1 ? '' : 's'} of ${name} are still available. Please adjust your cart.`
            : `${name} sold out while you were checking out.`
      });
    }

    let order;
    try {
      order = await Order.create({
        orderNumber,
        promoCode: promos.length > 0 ? promos[0].code : null,
        promoCodes: promos.map(p => p.code),
        venmoNote,
        paymentMethod,
        items: orderItems,
        totals: {
          subtotalCents: totals.subtotalCents,
          discountCents: totals.discountCents,
          shippingCents: totals.shippingCents,
          totalCents: totals.totalCents
        },
        customer: encryptedCustomer,
        inventoryDeductedAt: new Date()
      });
    } catch (error) {
      // Stock is already spent at this point — hand it back before bubbling up,
      // or a failed write silently burns inventory.
      await releaseStock(stockLines);
      throw error;
    }

    console.log(
      `[orders] Created ${order.orderNumber} (${order.items.length} items, total $${centsToDollars(
        totals.totalCents
      ).toFixed(2)})`
    );

    res.status(201).json({
      orderNumber,
      paymentMethod,
      ...(venmoPayment
        ? {
            venmoUrl: venmoPayment.webUrl,
            venmoPayment: {
              webUrl: venmoPayment.webUrl,
              deepLink: venmoPayment.deepLink,
              username: venmoPayment.username,
              amount: venmoPayment.amount,
              note: venmoPayment.note
            }
          }
        : {}),
      promoCode: promos.length > 0 ? promos[0].code : null,
      promoCodes: promos.map(p => p.code),
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
        phone: payload.customer.phone || null,
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

function buildVenmoPaymentData({ username, amount, note }) {
  const amountStr = amount.toFixed(2);
  const commonParams = { txn: 'pay', amount: amountStr, note, audience: 'private' };

  const webUrl = `https://venmo.com/${encodeURIComponent(username)}?` +
    new URLSearchParams(commonParams).toString();

  const deepLink = `venmo://paycharge?` +
    new URLSearchParams({ ...commonParams, recipients: username }).toString();

  return { username, amount: amountStr, note, webUrl, deepLink };
}

export default router;
