import type { Order } from '../types';
import { formatCurrencyCents } from './fmt';

function escapeHtml(value: string | undefined | null): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function printPackingSlip(order: Order): boolean {
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${escapeHtml(item.name)}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">x${item.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatCurrencyCents(item.lineTotalCents)}</td>
    </tr>
  `,
    )
    .join('');

  const customer = order.customer ?? {};
  const shippingText = formatCurrencyCents(order.totals?.shippingCents);
  const totalText = formatCurrencyCents(order.totals?.totalCents);

  const packingSlipHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Packing Slip - ${escapeHtml(order.orderNumber)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      padding: 40px;
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 2px solid #333;
      margin-bottom: 24px;
    }
    .brand { font-size: 24px; font-weight: 700; letter-spacing: 2px; }
    .brand-url { font-size: 12px; color: #666; margin-top: 4px; }
    .slip-title { font-size: 18px; color: #666; text-align: right; }
    .order-info {
      background: #f8f8f8;
      padding: 16px;
      margin-bottom: 24px;
    }
    .order-number { font-size: 16px; font-weight: 600; }
    .order-date { color: #666; margin-top: 4px; }
    .section { margin-bottom: 24px; }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 8px;
    }
    .address { font-size: 15px; }
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th {
      text-align: left;
      padding: 8px 0;
      border-bottom: 2px solid #333;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #666;
    }
    .items-table th:last-child { text-align: right; }
    .shipping-row {
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
      color: #666;
    }
    .total-row {
      margin-top: 8px;
      padding-top: 12px;
      border-top: 2px solid #333;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
    }
    .thank-you {
      text-align: center;
      padding: 24px 0;
      margin-top: 24px;
      border-top: 1px solid #eee;
      font-size: 15px;
      color: #666;
    }
    .disclaimer {
      margin-top: 24px;
      padding: 16px;
      background: #f8f8f8;
      font-size: 10px;
      color: #888;
      line-height: 1.6;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">EVOQ WELLNESS</div>
      <div class="brand-url">evoqwell.shop</div>
    </div>
    <div class="slip-title">Packing Slip</div>
  </div>

  <div class="order-info">
    <div class="order-number">Order ${escapeHtml(order.orderNumber)}</div>
    <div class="order-date">${escapeHtml(orderDate)}</div>
  </div>

  <div class="section">
    <div class="section-title">Ship To</div>
    <div class="address">
      ${escapeHtml(customer.name)}<br>
      ${escapeHtml(customer.address)}<br>
      ${escapeHtml(customer.city)}, ${escapeHtml(customer.state)} ${escapeHtml(customer.zip)}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Items</div>
    <table class="items-table">
      <thead>
        <tr>
          <th>Product</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <div class="shipping-row">
      <span>Shipping</span>
      <span>${shippingText}</span>
    </div>
    <div class="total-row">
      <span>Order Total</span>
      <span>${totalText}</span>
    </div>
  </div>

  <div class="thank-you">
    Thank you for your order!
  </div>

  <div class="disclaimer">
    EVOQ products are supplied exclusively for legitimate research purposes and are not intended for human consumption, veterinary use, or medical applications. By purchasing, you acknowledge these conditions and assume responsibility for proper handling and regulatory compliance.
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank', 'width=650,height=800');
  if (!printWindow) return false;
  printWindow.document.write(packingSlipHtml);
  printWindow.document.close();
  return true;
}
