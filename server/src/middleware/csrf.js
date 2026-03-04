import crypto from 'crypto';
import { anonymizeIpForLog } from '../utils/ipAnonymizer.js';

// In-memory token store (for production, use Redis or similar)
const tokenStore = new Map();

// Token expiration time (1 hour)
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

// Clean expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now > data.expiresAt) {
      tokenStore.delete(token);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

/**
 * Generate a new CSRF token
 * @returns {string} - The generated CSRF token
 */
export function generateCsrfToken() {
  const token = crypto.randomBytes(32).toString('hex');
  tokenStore.set(token, {
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
    createdAt: Date.now()
  });
  return token;
}

/**
 * Validate a CSRF token
 * @param {string} token - The token to validate
 * @returns {boolean} - Whether the token is valid
 */
export function validateCsrfToken(token) {
  if (!token) return false;

  const tokenData = tokenStore.get(token);
  if (!tokenData) return false;

  // Check expiration
  if (Date.now() > tokenData.expiresAt) {
    tokenStore.delete(token);
    return false;
  }

  return true;
}

/**
 * Middleware to validate CSRF tokens on state-changing requests
 */
export function csrfProtection(req, res, next) {
  // Skip CSRF validation for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for API endpoints that use admin token auth
  // Admin token in header provides similar protection
  if (req.headers['x-admin-token']) {
    return next();
  }

  // Get CSRF token from header or body
  const token = req.headers['x-csrf-token'] || req.body?._csrf;

  if (!token) {
    console.warn(`[Security] CSRF token missing from ${anonymizeIpForLog(req.ip)} for ${req.method} ${req.path}`);
    return res.status(403).json({
      error: 'CSRF token required',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  if (!validateCsrfToken(token)) {
    console.warn(`[Security] Invalid CSRF token from ${anonymizeIpForLog(req.ip)} for ${req.method} ${req.path}`);
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  next();
}

/**
 * Route handler to get a new CSRF token
 */
export function getCsrfToken(req, res) {
  const token = generateCsrfToken();

  res.json({
    csrfToken: token,
    expiresIn: TOKEN_EXPIRY_MS / 1000 // seconds
  });
}

/**
 * Middleware to attach CSRF token to response locals (for server-rendered pages)
 */
export function attachCsrfToken(req, res, next) {
  res.locals.csrfToken = generateCsrfToken();
  next();
}

export default {
  generateCsrfToken,
  validateCsrfToken,
  csrfProtection,
  getCsrfToken,
  attachCsrfToken
};
