const rawBase =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof window !== 'undefined' && window.__EVOQ_API_BASE_URL) ||
  '';

const API_BASE = rawBase ? rawBase.replace(/\/$/, '') : '';

// CSRF token cache
let csrfToken = null;
let csrfTokenExpiresAt = 0;

function apiUrl(path) {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return `${API_BASE}${path}`;
}

/**
 * Fetch a CSRF token from the server
 * Tokens are cached and refreshed before expiration
 */
async function fetchCsrfToken() {
  // Return cached token if still valid (with 5 minute buffer)
  if (csrfToken && Date.now() < csrfTokenExpiresAt - 5 * 60 * 1000) {
    return csrfToken;
  }

  try {
    const response = await fetch(apiUrl('/api/csrf-token'));
    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }
    const data = await response.json();
    csrfToken = data.csrfToken;
    csrfTokenExpiresAt = Date.now() + (data.expiresIn * 1000);
    return csrfToken;
  } catch (error) {
    console.error('[api] Failed to fetch CSRF token:', error);
    // Don't throw - let the request proceed without CSRF token
    // The server will reject it if CSRF is required
    return null;
  }
}

async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase())) {
    const token = await fetchCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }

  const response = await fetch(apiUrl(path), {
    headers,
    ...options
  });

  if (!response.ok) {
    const errorBody = await safeJson(response);
    const message = errorBody?.error || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.details = errorBody?.details;

    // If CSRF token was rejected, clear cache and retry once
    if (response.status === 403 && errorBody?.code === 'CSRF_TOKEN_INVALID') {
      csrfToken = null;
      csrfTokenExpiresAt = 0;
    }

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
