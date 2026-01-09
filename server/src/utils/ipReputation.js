import crypto from 'crypto';

// In-memory stores for rate limiting and reputation
const emailOrderAttempts = new Map(); // email -> { count, firstAttempt }
const ipSuspicionScores = new Map(); // ip -> { score, reasons, lastUpdate }

// Configuration
const EMAIL_RATE_LIMIT = 5; // Max orders per email per hour
const EMAIL_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const SUSPICION_THRESHOLD = 5; // Score above this blocks requests

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();

  // Clean email attempts
  for (const [email, data] of emailOrderAttempts.entries()) {
    if (now - data.firstAttempt > EMAIL_RATE_WINDOW_MS) {
      emailOrderAttempts.delete(email);
    }
  }

  // Reset suspicion scores older than 24 hours
  for (const [ip, data] of ipSuspicionScores.entries()) {
    if (now - data.lastUpdate > 24 * 60 * 60 * 1000) {
      ipSuspicionScores.delete(ip);
    }
  }
}, 15 * 60 * 1000); // Clean every 15 minutes

/**
 * Check if an IP appears to be a proxy/VPN based on headers
 * @param {object} req - Express request object
 * @returns {{ isProxy: boolean, indicators: string[] }}
 */
export function checkProxyIndicators(req) {
  const indicators = [];

  // Check for common proxy/VPN headers
  const proxyHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'true-client-ip',
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'via'
  ];

  const forwardedFor = req.get('x-forwarded-for');
  if (forwardedFor && forwardedFor.split(',').length > 2) {
    indicators.push('multiple-proxy-hops');
  }

  const via = req.get('via');
  if (via && via.toLowerCase().includes('proxy')) {
    indicators.push('via-header-proxy');
  }

  return {
    isProxy: indicators.length > 0,
    indicators
  };
}

/**
 * Calculate a suspicion score for a request
 * Higher score = more suspicious
 * @param {object} req - Express request object
 * @param {object} options - Additional context
 * @returns {{ score: number, reasons: string[] }}
 */
export function calculateSuspicionScore(req, options = {}) {
  const reasons = [];
  let score = 0;

  // Check proxy indicators
  const proxyCheck = checkProxyIndicators(req);
  if (proxyCheck.isProxy) {
    score += 2;
    reasons.push(...proxyCheck.indicators);
  }

  // Missing or suspicious User-Agent
  const userAgent = req.get('User-Agent') || '';
  if (!userAgent || userAgent.length < 20) {
    score += 2;
    reasons.push('missing-or-short-user-agent');
  }

  // Check for bot-like User-Agents
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /httpie/i
  ];
  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      score += 3;
      reasons.push('bot-user-agent');
      break;
    }
  }

  // Missing common headers
  if (!req.get('Accept-Language')) {
    score += 1;
    reasons.push('missing-accept-language');
  }

  // Check for rapid repeat attempts from same IP
  const ip = req.ip || 'unknown';
  const existingScore = ipSuspicionScores.get(ip);
  if (existingScore) {
    score += Math.min(existingScore.score, 3); // Cap carry-over
    reasons.push('repeat-attempts');
  }

  // Update stored score
  ipSuspicionScores.set(ip, {
    score,
    reasons,
    lastUpdate: Date.now()
  });

  return { score, reasons };
}

/**
 * Check if an IP should be blocked based on reputation
 * @param {object} req - Express request object
 * @returns {{ blocked: boolean, reason: string | null, score: number }}
 */
export function checkIpReputation(req) {
  const { score, reasons } = calculateSuspicionScore(req);

  if (score >= SUSPICION_THRESHOLD) {
    return {
      blocked: true,
      reason: `Suspicious activity detected: ${reasons.join(', ')}`,
      score
    };
  }

  return {
    blocked: false,
    reason: null,
    score
  };
}

/**
 * Check if an email is rate limited for orders
 * @param {string} email - Customer email
 * @returns {{ limited: boolean, remaining: number, resetIn: number }}
 */
export function checkEmailRateLimit(email) {
  if (!email) {
    return { limited: false, remaining: EMAIL_RATE_LIMIT, resetIn: 0 };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const existing = emailOrderAttempts.get(normalizedEmail);

  if (!existing || now - existing.firstAttempt > EMAIL_RATE_WINDOW_MS) {
    // Reset or initialize
    emailOrderAttempts.set(normalizedEmail, {
      count: 1,
      firstAttempt: now
    });
    return {
      limited: false,
      remaining: EMAIL_RATE_LIMIT - 1,
      resetIn: EMAIL_RATE_WINDOW_MS
    };
  }

  if (existing.count >= EMAIL_RATE_LIMIT) {
    const resetIn = EMAIL_RATE_WINDOW_MS - (now - existing.firstAttempt);
    return {
      limited: true,
      remaining: 0,
      resetIn
    };
  }

  // Increment count
  existing.count++;
  emailOrderAttempts.set(normalizedEmail, existing);

  return {
    limited: false,
    remaining: EMAIL_RATE_LIMIT - existing.count,
    resetIn: EMAIL_RATE_WINDOW_MS - (now - existing.firstAttempt)
  };
}

/**
 * Record a failed attempt (increases suspicion score)
 * @param {string} ip - IP address
 * @param {string} reason - Reason for failure
 */
export function recordFailedAttempt(ip, reason) {
  const existing = ipSuspicionScores.get(ip) || { score: 0, reasons: [], lastUpdate: Date.now() };
  existing.score += 1;
  existing.reasons.push(reason);
  existing.lastUpdate = Date.now();
  ipSuspicionScores.set(ip, existing);
}

/**
 * Middleware for IP reputation checking
 */
export function ipReputationMiddleware(req, res, next) {
  const reputation = checkIpReputation(req);

  if (reputation.blocked) {
    console.warn(`[Security] Blocked request from suspicious IP (score: ${reputation.score})`);
    return res.status(403).json({
      error: 'Request blocked due to suspicious activity',
      code: 'IP_BLOCKED'
    });
  }

  // Attach reputation info to request for logging
  req.ipReputation = reputation;
  next();
}

/**
 * Middleware for email rate limiting on orders
 */
export function emailRateLimitMiddleware(req, res, next) {
  const email = req.body?.customer?.email;

  if (!email) {
    return next();
  }

  const rateLimit = checkEmailRateLimit(email);

  if (rateLimit.limited) {
    const resetMinutes = Math.ceil(rateLimit.resetIn / 60000);
    console.warn(`[Security] Email rate limit exceeded for order attempt`);
    return res.status(429).json({
      error: `Too many order attempts. Please try again in ${resetMinutes} minutes.`,
      code: 'EMAIL_RATE_LIMITED',
      resetIn: rateLimit.resetIn
    });
  }

  // Add rate limit headers
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetIn / 1000));

  next();
}

export default {
  checkProxyIndicators,
  calculateSuspicionScore,
  checkIpReputation,
  checkEmailRateLimit,
  recordFailedAttempt,
  ipReputationMiddleware,
  emailRateLimitMiddleware
};
