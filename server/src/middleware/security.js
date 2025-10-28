import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';

// Security headers with Helmet
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://evoqsite-production.up.railway.app"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding if needed
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// General rate limiter (100 requests per 15 minutes)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Trust proxy settings for Railway
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
});

// Strict rate limiter for auth endpoints (5 requests per 15 minutes)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Order creation rate limiter (10 requests per hour)
export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many orders from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Promo code validation rate limiter (20 attempts per hour)
export const promoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many promo code attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// MongoDB injection prevention
export const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[Security] Attempted NoSQL injection in ${key} from IP ${req.ip}`);
  }
});

// XSS sanitization function for user inputs
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  // Remove any HTML tags and dangerous characters
  return xss(input, {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  });
}

// Middleware to sanitize request body
export function sanitizeBody(req, res, next) {
  if (req.body) {
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeInput(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };
    sanitizeObject(req.body);
  }
  next();
}

// Security event logger
export function logSecurityEvent(eventType, details, req) {
  const event = {
    type: eventType,
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    details
  };

  console.log('[SECURITY EVENT]', JSON.stringify(event));
  // In production, you might want to send this to a logging service
}

// Input validation helpers
export const validators = {
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidZipCode: (zip) => {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return zipRegex.test(zip);
  },

  isValidPhone: (phone) => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  },

  isValidPromoCode: (code) => {
    const promoRegex = /^[A-Z0-9_\-]{3,20}$/;
    return promoRegex.test(code);
  },

  sanitizeProductId: (id) => {
    // Only allow alphanumeric and hyphens
    return id.replace(/[^a-zA-Z0-9\-]/g, '');
  }
};

// Additional security headers
export function additionalSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
}

export default {
  helmetMiddleware,
  generalLimiter,
  authLimiter,
  orderLimiter,
  promoLimiter,
  mongoSanitizeMiddleware,
  sanitizeBody,
  sanitizeInput,
  logSecurityEvent,
  validators,
  additionalSecurityHeaders
};