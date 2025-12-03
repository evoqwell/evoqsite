import { getApiBase } from './api.js';

function buildUrl(path) {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  const base = getApiBase();
  return `${base}${path}`;
}

async function adminFetch(path, token, options = {}) {
  if (!token) {
    throw new Error('Admin token is required.');
  }
  const response = await fetch(buildUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const message = await extractError(response);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('[adminApi] Failed to parse JSON', error);
    return null;
  }
}

async function extractError(response) {
  try {
    const text = await response.text();
    if (!text) {
      return `Request failed with status ${response.status}`;
    }
    const data = JSON.parse(text);
    return data.error || `Request failed with status ${response.status}`;
  } catch (error) {
    return `Request failed with status ${response.status}`;
  }
}

export function fetchAdminProducts(token) {
  return adminFetch('/api/admin/products', token, { method: 'GET' });
}

export function createAdminProduct(token, payload) {
  return adminFetch('/api/admin/products', token, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateAdminProduct(token, sku, payload) {
  return adminFetch(`/api/admin/products/${encodeURIComponent(sku)}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteAdminProduct(token, sku) {
  return adminFetch(`/api/admin/products/${encodeURIComponent(sku)}`, token, {
    method: 'DELETE'
  });
}

export function fetchAdminPromos(token) {
  return adminFetch('/api/admin/promos', token, { method: 'GET' });
}

export function createAdminPromo(token, payload) {
  return adminFetch('/api/admin/promos', token, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateAdminPromo(token, code, payload) {
  return adminFetch(`/api/admin/promos/${encodeURIComponent(code)}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteAdminPromo(token, code) {
  return adminFetch(`/api/admin/promos/${encodeURIComponent(code)}`, token, {
    method: 'DELETE'
  });
}

export function fetchAdminOrders(token) {
  return adminFetch('/api/admin/orders', token, { method: 'GET' });
}

export function updateAdminOrderStatus(token, orderNumber, status) {
  return adminFetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export function fetchAdminAnalytics(token, range = 'daily') {
  return adminFetch(`/api/admin/analytics?range=${encodeURIComponent(range)}`, token, {
    method: 'GET'
  });
}
