import crypto from 'crypto';

// Daily rotating salt for IP hashing
// This allows counting unique visitors per day while preventing long-term tracking
let currentSalt = null;
let saltDate = null;

/**
 * Get the daily salt for IP hashing
 * Rotates at midnight UTC for privacy
 */
function getDailySalt() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  if (saltDate !== today) {
    // Generate a new salt based on the date and a secret
    const secret = process.env.IP_HASH_SECRET || process.env.JWT_SECRET || 'ip-hash-default';
    currentSalt = crypto
      .createHash('sha256')
      .update(`${secret}-${today}`)
      .digest();
    saltDate = today;
  }

  return currentSalt;
}

/**
 * Hash an IP address for GDPR-compliant storage
 * Uses SHA-256 with a daily rotating salt
 *
 * @param {string} ip - The IP address to hash
 * @returns {string} - Hashed IP (hex string, truncated to 16 chars for storage)
 */
export function hashIp(ip) {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }

  const salt = getDailySalt();
  const hash = crypto
    .createHmac('sha256', salt)
    .update(ip)
    .digest('hex')
    .substring(0, 16); // Truncate for storage efficiency

  return `h:${hash}`; // Prefix to indicate hashed IP
}

/**
 * Truncate IP address for privacy (alternative to hashing)
 * IPv4: Keep first 3 octets (xxx.xxx.xxx.0)
 * IPv6: Keep first 3 groups (xxxx:xxxx:xxxx::)
 *
 * @param {string} ip - The IP address to truncate
 * @returns {string} - Truncated IP
 */
export function truncateIp(ip) {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }

  // Handle IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 3) {
      return `${parts[0]}:${parts[1]}:${parts[2]}::`;
    }
    return ip.replace(/:[^:]*$/, '::');
  }

  // Handle IPv4
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }

  return ip;
}

/**
 * Anonymize IP for logging (shows partial IP for debugging)
 * IPv4: xxx.xxx.***.***
 * IPv6: xxxx:xxxx:****:****:****:****:****:****
 *
 * @param {string} ip - The IP address to anonymize
 * @returns {string} - Partially anonymized IP
 */
export function anonymizeIpForLog(ip) {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }

  // Handle IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:****`;
    }
    return '****:****';
  }

  // Handle IPv4
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }

  return '***';
}

/**
 * Check if an IP is already hashed
 * @param {string} ip - The IP to check
 * @returns {boolean} - True if already hashed
 */
export function isHashedIp(ip) {
  return typeof ip === 'string' && ip.startsWith('h:');
}

export default {
  hashIp,
  truncateIp,
  anonymizeIpForLog,
  isHashedIp
};
