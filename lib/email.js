const PUBLIC_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_EMAILJS_PUBLIC_KEY) ||
  (typeof window !== 'undefined' && window.__EVOQ_EMAILJS_PUBLIC_KEY) ||
  '';

const SERVICE_ID =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_EMAILJS_SERVICE_ID) ||
  (typeof window !== 'undefined' && window.__EVOQ_EMAILJS_SERVICE_ID) ||
  '';

const BUYER_TEMPLATE_ID =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_EMAILJS_BUYER_TEMPLATE_ID) ||
  (typeof window !== 'undefined' && window.__EVOQ_EMAILJS_BUYER_TEMPLATE_ID) ||
  '';

const ADMIN_TEMPLATE_ID =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID) ||
  (typeof window !== 'undefined' && window.__EVOQ_EMAILJS_ADMIN_TEMPLATE_ID) ||
  '';

const FROM_EMAIL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_EMAILJS_FROM_EMAIL) ||
  (typeof window !== 'undefined' && window.__EVOQ_EMAILJS_FROM_EMAIL) ||
  '';

let initialized = false;

function getEmailJs() {
  if (typeof window === 'undefined' || typeof window.emailjs === 'undefined') {
    return null;
  }
  return window.emailjs;
}

function canSendEmails() {
  return Boolean(getEmailJs() && PUBLIC_KEY && SERVICE_ID && BUYER_TEMPLATE_ID && ADMIN_TEMPLATE_ID);
}

function formatCurrency(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return '$0.00';
  }
  return `$${numeric.toFixed(2)}`;
}

async function ensureInitialized(emailjs) {
  if (initialized) {
    return;
  }
  emailjs.init(PUBLIC_KEY);
  initialized = true;
}

/**
 * Send buyer and admin order emails using EmailJS.
 * @param {Object} order Api response order payload
 * @returns {Promise<{buyer: boolean, admin: boolean}>}
 */
export async function sendOrderEmails(order) {
  const emailjs = getEmailJs();
  if (!canSendEmails()) {
    console.warn('[email] EmailJS not configured on the client. Skipping confirmation emails.');
    return { buyer: false, admin: false, skipped: true };
  }

  if (!order || !order.customer) {
    console.warn('[email] Missing order/customer details. Skipping confirmation emails.');
    return { buyer: false, admin: false, skipped: true };
  }

  await ensureInitialized(emailjs);

  const itemsBlock = Array.isArray(order.items)
    ? order.items
        .map((item) => {
          const name = item?.name || 'Item';
          const qty = Number(item?.quantity || 0);
          const lineTotal = formatCurrency(Number(item?.lineTotal || 0));
          return `${name} (x${qty}) - ${lineTotal}`;
        })
        .join('\n')
    : '';

  const subtotal = formatCurrency(order.totals?.subtotal ?? 0);
  const discountValue = Number(order.totals?.discount ?? 0);
  const discount = discountValue > 0 ? formatCurrency(discountValue) : 'N/A';
  const shipping = formatCurrency(order.totals?.shipping ?? 0);
  const total = formatCurrency(order.totals?.total ?? 0);
  const promoCode = order.promoCode || 'N/A';
  const venmoUrl = order.venmoUrl || '';

  const buyerParams = {
    to_email: order.customer.email,
    reply_to: order.customer.email,
    from_email: FROM_EMAIL || undefined,
    customer_name: order.customer.name,
    order_number: order.orderNumber,
    items: itemsBlock,
    subtotal,
    discount,
    promo_code: promoCode,
    shipping,
    total,
    venmo_link: venmoUrl,
    fulfillment:
      "We'll carefully prepare and ship your order within 2-3 business days after payment confirmation. If you have any questions, we're here to help!",
    thank_you_message:
      'Thank you for choosing EVOQ for your research needs. We appreciate your trust in us and look forward to supporting your scientific work.'
  };

  const adminAddress = [
    order.customer.address,
    `${order.customer.city}, ${order.customer.state} ${order.customer.zip}`
  ]
    .filter(Boolean)
    .join('\n');

  const adminParams = {
    to_email: undefined,
    from_email: FROM_EMAIL || undefined,
    order_number: order.orderNumber,
    items: itemsBlock,
    subtotal,
    discount,
    promo_code: promoCode,
    shipping,
    total,
    // Provide both namespaced and legacy keys so existing EmailJS templates keep working
    customer_name: order.customer.name,
    name: order.customer.name,
    customer_address: adminAddress,
    address: adminAddress,
    customer_email: order.customer.email,
    email: order.customer.email,
    venmo_note: order.orderNumber
  };

  const [buyerResult, adminResult] = await Promise.allSettled([
    emailjs.send(SERVICE_ID, BUYER_TEMPLATE_ID, buyerParams),
    emailjs.send(SERVICE_ID, ADMIN_TEMPLATE_ID, adminParams)
  ]);

  const errors = [];
  if (buyerResult.status === 'rejected') {
    errors.push(`buyer: ${buyerResult.reason?.message || buyerResult.reason}`);
  }
  if (adminResult.status === 'rejected') {
    errors.push(`admin: ${adminResult.reason?.message || adminResult.reason}`);
  }

  if (errors.length > 0) {
    throw new Error(`EmailJS send failed (${errors.join(', ')})`);
  }

  return { buyer: true, admin: true };
}
