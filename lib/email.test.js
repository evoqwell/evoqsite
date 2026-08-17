import { describe, expect, it } from 'vitest';
import { renderBuyerPaymentHtml } from './email.js';

describe('renderBuyerPaymentHtml', () => {
  it('renders Square instructions without a Venmo button for card orders', () => {
    const html = renderBuyerPaymentHtml({
      isCardOrder: true,
      total: '$65.00',
      venmoUsername: '',
      venmoUrl: '',
      orderNumber: 'EVOQ-20260817-CARD',
      customerPhone: '(555) 123-4567'
    });

    expect(html).toContain('text message from <strong>Square</strong>');
    expect(html).toContain('(555) 123-4567');
    expect(html).not.toContain('Open in Venmo');
    expect(html).not.toContain('<a ');
  });

  it('renders the payment link for Venmo orders', () => {
    const html = renderBuyerPaymentHtml({
      isCardOrder: false,
      total: '$65.00',
      venmoUsername: 'EVOQWELL',
      venmoUrl: 'https://account.venmo.com/payment-link?amount=65.00&txn=pay',
      orderNumber: 'EVOQ-20260817-VENMO',
      customerPhone: ''
    });

    expect(html).toContain('Open in Venmo');
    expect(html).toContain('href="https://account.venmo.com/payment-link?amount=65.00&amp;txn=pay"');
    expect(html).toContain('EVOQ-20260817-VENMO');
  });

  it('does not render an inert button when a Venmo URL is missing', () => {
    const html = renderBuyerPaymentHtml({
      isCardOrder: false,
      total: '$65.00',
      venmoUsername: 'EVOQWELL',
      venmoUrl: '',
      orderNumber: 'EVOQ-20260817-MISSING',
      customerPhone: ''
    });

    expect(html).not.toContain('Open in Venmo');
    expect(html).not.toContain('<a ');
  });
});
