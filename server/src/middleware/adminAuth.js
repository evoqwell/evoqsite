import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { anonymizeIpForLog } from '../utils/ipAnonymizer.js';

/**
 * Timing-safe comparison of two strings
 * Returns false if lengths differ (to avoid timing leaks on length)
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Token blacklist for logged out tokens (in production, use Redis)
const tokenBlacklist = new Set();

// Clean up expired tokens from blacklist periodically
setInterval(() => {
  const now = Date.now();
  for (const token of tokenBlacklist) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp && decoded.exp * 1000 < now) {
        tokenBlacklist.delete(token);
      }
    } catch {
      tokenBlacklist.delete(token);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

/**
 * Generate a JWT token for admin access
 * @param {string} adminId - Identifier for the admin (can be 'admin' for single-user system)
 * @returns {string} JWT token
 */
export function generateAdminToken(adminId = 'admin') {
  return jwt.sign(
    {
      sub: adminId,
      role: 'admin',
      iat: Math.floor(Date.now() / 1000)
    },
    config.admin.jwtSecret,
    { expiresIn: config.admin.jwtExpiresIn }
  );
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {object|null} Decoded token payload or null if invalid
 */
export function verifyAdminToken(token) {
  try {
    if (tokenBlacklist.has(token)) {
      return null;
    }
    return jwt.verify(token, config.admin.jwtSecret);
  } catch (error) {
    return null;
  }
}

/**
 * Invalidate a token (logout)
 * @param {string} token - Token to invalidate
 */
export function invalidateToken(token) {
  if (token) {
    tokenBlacklist.add(token);
  }
}

/**
 * Middleware to require admin authentication
 * Supports both:
 * - Legacy: X-Admin-Token header with access token (returns JWT for migration)
 * - JWT: Authorization: Bearer <token> header
 */
export function requireAdmin(req, res, next) {
  // Check for JWT in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyAdminToken(token);

    if (decoded) {
      req.admin = decoded;
      req.adminToken = token;
      return next();
    }

    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Legacy: Check X-Admin-Token header (for backwards compatibility during migration)
  const legacyToken = req.headers['x-admin-token'] || req.get('X-Admin-Token');

  if (!config.admin.accessToken) {
    return res.status(503).json({ error: 'Admin access is not configured.' });
  }

  if (legacyToken && safeCompare(legacyToken, config.admin.accessToken)) {
    // Generate JWT for legacy token authentication
    // This helps migrate to JWT-based auth
    req.admin = { sub: 'admin', role: 'admin' };
    req.isLegacyAuth = true;
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
}

/**
 * Login handler - validates access token and returns JWT
 */
export function adminLogin(req, res) {
  const { accessToken } = req.body;

  if (!config.admin.accessToken) {
    return res.status(503).json({ error: 'Admin access is not configured.' });
  }

  if (!accessToken || !safeCompare(accessToken, config.admin.accessToken)) {
    console.warn(`[Security] Failed admin login attempt from ${anonymizeIpForLog(req.ip)}`);
    return res.status(401).json({ error: 'Invalid access token' });
  }

  const token = generateAdminToken();
  const decoded = jwt.decode(token);

  console.log(`[Admin] Successful login from ${anonymizeIpForLog(req.ip)}`);

  res.json({
    token,
    expiresAt: decoded.exp * 1000,
    expiresIn: config.admin.sessionTimeout
  });
}

/**
 * Logout handler - invalidates the current token
 */
export function adminLogout(req, res) {
  const token = req.adminToken;
  if (token) {
    invalidateToken(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
}

/**
 * Refresh token handler - issues a new token if current one is still valid
 */
export function refreshToken(req, res) {
  const token = req.adminToken;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Invalidate old token
  invalidateToken(token);

  // Issue new token
  const newToken = generateAdminToken(req.admin?.sub);
  const decoded = jwt.decode(newToken);

  res.json({
    token: newToken,
    expiresAt: decoded.exp * 1000,
    expiresIn: config.admin.sessionTimeout
  });
}

/**
 * Get remaining session time
 */
export function getSessionInfo(req, res) {
  const token = req.adminToken;
  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    const decoded = jwt.decode(token);
    const expiresAt = decoded.exp * 1000;
    const remainingMs = expiresAt - Date.now();

    res.json({
      authenticated: true,
      expiresAt,
      remainingMs: Math.max(0, remainingMs),
      remainingMinutes: Math.max(0, Math.floor(remainingMs / 60000))
    });
  } catch {
    res.json({ authenticated: false });
  }
}

export default {
  requireAdmin,
  adminLogin,
  adminLogout,
  refreshToken,
  getSessionInfo,
  generateAdminToken,
  verifyAdminToken,
  invalidateToken
};
