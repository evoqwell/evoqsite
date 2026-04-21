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

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render the order items as HTML table rows for use in email templates.
 * Each row: | Product name (xQty) | Line total |
 * Emits inline styles because most email clients strip <style> blocks.
 */
function renderItemsHtml(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items
    .map((item) => {
      const name = escapeHtml(item?.name || 'Item');
      const qty = Number(item?.quantity || 0);
      const lineTotal = formatCurrency(Number(item?.lineTotal || 0));
      return (
        '<tr>' +
          '<td style="padding:10px 0;border-bottom:1px solid #eee3d2;color:#2f2a25;font-size:14px;">' +
            name +
            '<span style="color:#8a7d6e;"> × ' + qty + '</span>' +
          '</td>' +
          '<td style="padding:10px 0;border-bottom:1px solid #eee3d2;color:#2f2a25;font-size:14px;text-align:right;font-variant-numeric:tabular-nums;">' +
            lineTotal +
          '</td>' +
        '</tr>'
      );
    })
    .join('');
}

// Public site URL for email-embedded assets (logo, footer links).
// Deliberately does NOT fall back to window.location — a buyer opening their
// inbox 10 minutes from now can't reach localhost:5173/Logo.PNG. Always
// resolve to an internet-reachable host.
const PUBLIC_SITE_URL_FALLBACK = 'https://evoqwell.shop';

function getSiteUrl() {
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SITE_URL) || '';
  const trimmed = envUrl.replace(/\/$/, '');
  // If env is missing, empty, or points at localhost, use the production URL.
  if (!trimmed || /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(trimmed)) {
    return PUBLIC_SITE_URL_FALLBACK;
  }
  return trimmed;
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

  const itemsHtml = renderItemsHtml(order.items);
  const siteUrl = getSiteUrl();
  const logoUrl = `${siteUrl}/Logo.PNG`;

  const subtotal = formatCurrency(order.totals?.subtotal ?? 0);
  const discountValue = Number(order.totals?.discount ?? 0);
  const discount = discountValue > 0 ? formatCurrency(discountValue) : 'N/A';
  const shipping = formatCurrency(order.totals?.shipping ?? 0);
  const total = formatCurrency(order.totals?.total ?? 0);
  const promoCode = order.promoCode || 'N/A';
  const venmoUrl = order.venmoUrl || '';

  const venmoUsername = order.venmoPayment?.username || 'EVOQWELL';

  const buyerParams = {
    to_email: order.customer.email,
    reply_to: order.customer.email,
    from_email: FROM_EMAIL || undefined,
    customer_name: order.customer.name,
    order_number: order.orderNumber,
    items: itemsBlock,
    items_html: itemsHtml,
    subtotal,
    discount,
    has_discount: discountValue > 0 ? 'yes' : '',
    promo_code: promoCode,
    shipping,
    total,
    venmo_link: venmoUrl,
    venmo_username: venmoUsername,
    venmo_instructions: `Open Venmo and send ${total} to @${venmoUsername} with the note: ${order.orderNumber}`,
    fulfillment:
      "We'll carefully prepare and ship your order within 2-3 business days after payment confirmation. If you have any questions, we're here to help!",
    thank_you_message:
      'Thank you for choosing EVOQ for your research needs. We appreciate your trust in us and look forward to supporting your scientific work.',
    site_url: siteUrl,
    logo_url: logoUrl,
    brand_name: 'EVOQ'
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
    items_html: itemsHtml,
    subtotal,
    discount,
    has_discount: discountValue > 0 ? 'yes' : '',
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
    venmo_note: order.orderNumber,
    site_url: siteUrl,
    admin_url: `${siteUrl}/admin/orders/${order.orderNumber}`,
    logo_url: logoUrl,
    brand_name: 'EVOQ'
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
