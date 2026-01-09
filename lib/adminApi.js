import { getApiBase } from './api.js';

// JWT token storage
let jwtToken = null;
let tokenExpiresAt = 0;
let refreshTimeoutId = null;

// Session timeout warning callback
let onSessionWarning = null;
let onSessionExpired = null;

function buildUrl(path) {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  const base = getApiBase();
  return `${base}${path}`;
}

/**
 * Set callbacks for session events
 */
export function setSessionCallbacks({ onWarning, onExpired }) {
  onSessionWarning = onWarning;
  onSessionExpired = onExpired;
}

/**
 * Login with access token and receive JWT
 */
export async function adminLogin(accessToken) {
  const response = await fetch(buildUrl('/api/admin/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken })
  });

  if (!response.ok) {
    const message = await extractError(response);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  setToken(data.token, data.expiresAt);
  return data;
}

/**
 * Logout and invalidate token
 */
export async function adminLogout() {
  if (!jwtToken) return;

  try {
    await fetch(buildUrl('/api/admin/logout'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
  } catch (error) {
    console.error('[adminApi] Logout error:', error);
  } finally {
    clearToken();
  }
}

/**
 * Refresh the JWT token
 */
export async function refreshAdminToken() {
  if (!jwtToken) return null;

  const response = await fetch(buildUrl('/api/admin/refresh-token'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    }
  });

  if (!response.ok) {
    clearToken();
    if (onSessionExpired) onSessionExpired();
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json();
  setToken(data.token, data.expiresAt);
  return data;
}

/**
 * Get session info
 */
export async function getSessionInfo() {
  if (!jwtToken) return { authenticated: false };

  const response = await fetch(buildUrl('/api/admin/session'), {
    headers: { 'Authorization': `Bearer ${jwtToken}` }
  });

  if (!response.ok) {
    return { authenticated: false };
  }

  return response.json();
}

/**
 * Check if currently authenticated
 */
export function isAuthenticated() {
  return jwtToken && Date.now() < tokenExpiresAt;
}

/**
 * Get current JWT token
 */
export function getJwtToken() {
  return jwtToken;
}

/**
 * Set token and schedule refresh
 */
function setToken(token, expiresAt) {
  jwtToken = token;
  tokenExpiresAt = expiresAt;

  // Store in sessionStorage for page reloads
  try {
    sessionStorage.setItem('evoq_admin_jwt', token);
    sessionStorage.setItem('evoq_admin_jwt_expires', String(expiresAt));
  } catch (e) {
    // Ignore storage errors
  }

  scheduleTokenRefresh();
}

/**
 * Clear token and cancel refresh
 */
function clearToken() {
  jwtToken = null;
  tokenExpiresAt = 0;

  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }

  try {
    sessionStorage.removeItem('evoq_admin_jwt');
    sessionStorage.removeItem('evoq_admin_jwt_expires');
    sessionStorage.removeItem('evoq_admin_token'); // Clear legacy token
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Schedule token refresh before expiration
 */
function scheduleTokenRefresh() {
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
  }

  const remainingMs = tokenExpiresAt - Date.now();

  // Warn user 5 minutes before expiration
  const warningTime = remainingMs - 5 * 60 * 1000;
  if (warningTime > 0 && onSessionWarning) {
    setTimeout(() => {
      if (isAuthenticated()) {
        onSessionWarning(5);
      }
    }, warningTime);
  }

  // Refresh token 2 minutes before expiration
  const refreshTime = remainingMs - 2 * 60 * 1000;
  if (refreshTime > 0) {
    refreshTimeoutId = setTimeout(async () => {
      try {
        await refreshAdminToken();
      } catch (error) {
        console.error('[adminApi] Auto-refresh failed:', error);
      }
    }, refreshTime);
  }
}

/**
 * Restore token from sessionStorage (for page reloads)
 */
export function restoreSession() {
  try {
    const savedToken = sessionStorage.getItem('evoq_admin_jwt');
    const savedExpires = sessionStorage.getItem('evoq_admin_jwt_expires');

    if (savedToken && savedExpires) {
      const expiresAt = parseInt(savedExpires, 10);
      if (Date.now() < expiresAt) {
        jwtToken = savedToken;
        tokenExpiresAt = expiresAt;
        scheduleTokenRefresh();
        return true;
      } else {
        // Token expired, clear it
        clearToken();
      }
    }
  } catch (e) {
    // Ignore storage errors
  }
  return false;
}

/**
 * Admin API fetch with JWT authentication
 * Falls back to legacy token if JWT not available
 */
async function adminFetch(path, token, options = {}) {
  // Determine which auth to use
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Prefer JWT if available
  if (jwtToken && isAuthenticated()) {
    headers['Authorization'] = `Bearer ${jwtToken}`;
  } else if (token) {
    // Legacy token support
    headers['X-Admin-Token'] = token;
  } else {
    throw new Error('Authentication required.');
  }

  const response = await fetch(buildUrl(path), {
    headers,
    ...options
  });

  if (!response.ok) {
    const message = await extractError(response);
    const error = new Error(message);
    error.status = response.status;

    // Handle token expiration
    if (response.status === 401) {
      const body = await response.clone().json().catch(() => ({}));
      if (body.code === 'TOKEN_EXPIRED') {
        clearToken();
        if (onSessionExpired) onSessionExpired();
      }
    }

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
