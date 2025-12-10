import { getApiBase } from './api.js';

/**
 * Track a page view. Fails silently.
 */
export function trackPageView(page) {
  if (page !== 'homepage' && page !== 'products') {
    return;
  }

  const url = `${getApiBase()}/api/track`;
  const data = JSON.stringify({ page });

  if (navigator.sendBeacon) {
    const blob = new Blob([data], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
  } else {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data,
      keepalive: true
    }).catch(() => {});
  }
}

/**
 * Auto-track based on current URL
 */
export function autoTrack() {
  const path = window.location.pathname;

  if (path === '/' || path === '/index.html') {
    trackPageView('homepage');
  } else if (path === '/shop.html' || path === '/shop' || path === '/shop/') {
    trackPageView('products');
  }
}
