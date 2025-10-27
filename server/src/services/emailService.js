import { config } from '../config/env.js';
import { centsToDollars } from '../utils/money.js';

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

function isEmailJsConfigured() {
  const { serviceId, buyerTemplateId, adminTemplateId, publicKey } = config.emailjs;
  return Boolean(serviceId && buyerTemplateId && adminTemplateId && publicKey && config.email.admin);
}

function formatLineItems(order) {
  return order.items
    .map((item) => `${item.name} (x${item.quantity}) - $${centsToDollars(item.lineTotalCents).toFixed(2)}`)
    .join('\n');
}

function formatAddress(customer) {
  return `${customer.address}\n${customer.city}, ${customer.state} ${customer.zip}`;
}

async function sendEmailJs(templateId, templateParams) {
  const payload = {
    service_id: config.emailjs.serviceId,
    template_id: templateId,
    user_id: config.emailjs.publicKey,
    template_params: templateParams
  };

  if (config.emailjs.accessToken) {
    payload.accessToken = config.emailjs.accessToken;
  }

  const response = await fetch(EMAILJS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EmailJS request failed with status ${response.status}: ${errorText}`);
  }
}

export async function sendOrderEmails(order, { venmoUrl }) {
  if (!isEmailJsConfigured()) {
    console.warn('[email] EmailJS configuration incomplete. Skipping confirmation emails.');
    return;
  }

  const itemsBlock = formatLineItems(order);
  const subtotal = `$${centsToDollars(order.totals.subtotalCents).toFixed(2)}`;
  const discount = `$${centsToDollars(order.totals.discountCents).toFixed(2)}`;
  const shipping = `$${centsToDollars(order.totals.shippingCents).toFixed(2)}`;
  const total = `$${centsToDollars(order.totals.totalCents).toFixed(2)}`;
  const address = formatAddress(order.customer);

  const buyerParams = {
    to_email: order.customer.email,
    reply_to: order.customer.email,
    from_email: config.email.from,
    customer_name: order.customer.name,
    order_number: order.orderNumber,
    items: itemsBlock,
    subtotal,
    discount: order.totals.discountCents > 0 ? discount : 'N/A',
    promo_code: order.promoCode || 'N/A',
    shipping,
    total,
    venmo_link: venmoUrl,
    fulfillment:
      "We'll carefully prepare and ship your order within 2-3 business days after payment confirmation. If you have any questions, we're here to help!",
    thank_you_message:
      'Thank you for choosing EVOQ for your research needs. We appreciate your trust in us and look forward to supporting your scientific work.'
  };

  const adminParams = {
    to_email: config.email.admin,
    from_email: config.email.from,
    order_number: order.orderNumber,
    items: itemsBlock,
    subtotal,
    discount: order.totals.discountCents > 0 ? discount : 'N/A',
    promo_code: order.promoCode || 'N/A',
    shipping,
    total,
    customer_name: order.customer.name,
    customer_address: address,
    customer_email: order.customer.email,
    venmo_note: order.venmoNote
  };

  const results = await Promise.allSettled([
    sendEmailJs(config.emailjs.buyerTemplateId, buyerParams),
    sendEmailJs(config.emailjs.adminTemplateId, adminParams)
  ]);

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const template = index === 0 ? 'buyer confirmation' : 'admin notification';
      console.error(`[email] Failed to send ${template}:`, result.reason);
    }
  });
}
