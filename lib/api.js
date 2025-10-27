const rawBase =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof window !== 'undefined' && window.__EVOQ_API_BASE_URL) ||
  '';

const API_BASE = rawBase ? rawBase.replace(/\/$/, '') : '';

function apiUrl(path) {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return `${API_BASE}${path}`;
}

async function apiFetch(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const errorBody = await safeJson(response);
    const message = errorBody?.error || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.details = errorBody?.details;
    throw error;
  }

  return safeJson(response);
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('[api] Failed to parse JSON response', error);
    return null;
  }
}

export async function fetchProducts() {
  const data = await apiFetch('/api/products');
  return {
    products: data?.products || [],
    meta: data?.meta || {}
  };
}

export async function fetchPromoCode(code) {
  const trimmed = code?.trim();
  if (!trimmed) {
    throw new Error('Promo code is required.');
  }
  const data = await apiFetch(`/api/promos/${encodeURIComponent(trimmed)}`);
  return data?.promo;
}

export async function createOrder(orderPayload) {
  return apiFetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderPayload)
  });
}

export function getApiBase() {
  return API_BASE;
}

export { apiFetch };
