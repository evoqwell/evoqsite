/**
 * Security utilities for sanitizing user inputs and preventing XSS attacks
 */

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} str - The string to escape
 * @returns {string} The escaped string
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return str;

  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  return str.replace(/[&<>"'`=/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Sanitizes a string to be safe for use in HTML attributes
 * @param {string} str - The string to sanitize
 * @returns {string} The sanitized string
 */
export function sanitizeAttribute(str) {
  if (typeof str !== 'string') return str;

  // Remove any quotes and escape special characters
  return str
    .replace(/['"]/g, '')
    .replace(/[&<>]/g, (char) => {
      const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
      };
      return escapeMap[char];
    });
}

/**
 * Validates and sanitizes email addresses
 * @param {string} email - The email to validate
 * @returns {string|null} The sanitized email or null if invalid
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') return null;

  // Basic email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmedEmail = email.trim().toLowerCase();

  if (!emailRegex.test(trimmedEmail)) {
    return null;
  }

  // Remove any potentially dangerous characters
  return trimmedEmail.replace(/[<>'"]/g, '');
}

/**
 * Sanitizes user input for display in text content
 * @param {string} text - The text to sanitize
 * @returns {string} The sanitized text
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';

  // Remove any HTML tags and trim whitespace
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates and sanitizes phone numbers
 * @param {string} phone - The phone number to sanitize
 * @returns {string} The sanitized phone number
 */
export function sanitizePhone(phone) {
  if (typeof phone !== 'string') return '';

  // Keep only digits, spaces, hyphens, parentheses, and plus
  return phone.replace(/[^\d\s\-\+\(\)]/g, '');
}

/**
 * Validates and sanitizes zip codes
 * @param {string} zip - The zip code to sanitize
 * @returns {string} The sanitized zip code
 */
export function sanitizeZipCode(zip) {
  if (typeof zip !== 'string') return '';

  // Keep only digits and hyphens (for ZIP+4 format)
  return zip.replace(/[^\d\-]/g, '').slice(0, 10);
}

/**
 * Sanitizes product IDs/SKUs
 * @param {string} id - The product ID to sanitize
 * @returns {string} The sanitized ID
 */
export function sanitizeProductId(id) {
  if (typeof id !== 'string') return '';

  // Allow only alphanumeric and hyphens
  return id.replace(/[^a-zA-Z0-9\-]/g, '');
}

/**
 * Validates and sanitizes promo codes
 * @param {string} code - The promo code to sanitize
 * @returns {string} The sanitized promo code
 */
export function sanitizePromoCode(code) {
  if (typeof code !== 'string') return '';

  // Convert to uppercase and keep only alphanumeric, hyphens, and underscores
  return code.toUpperCase().replace(/[^A-Z0-9_\-]/g, '').slice(0, 20);
}

/**
 * Sanitizes currency values
 * @param {number|string} value - The value to sanitize
 * @returns {number} The sanitized value as a number
 */
export function sanitizeCurrency(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;

  // Remove any non-numeric characters except dots
  const cleaned = value.replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}

/**
 * Creates a safe DOM element with text content
 * @param {string} tag - The HTML tag name
 * @param {string} content - The text content
 * @param {object} attributes - Optional attributes
 * @returns {HTMLElement} The created element
 */
export function createSafeElement(tag, content, attributes = {}) {
  const element = document.createElement(tag);

  // Use textContent instead of innerHTML for safety
  if (content) {
    element.textContent = content;
  }

  // Set attributes safely
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') {
      element.className = sanitizeAttribute(value);
    } else if (key === 'id') {
      element.id = sanitizeAttribute(value);
    } else if (key.startsWith('data-')) {
      element.setAttribute(key, sanitizeAttribute(value));
    } else if (['href', 'src'].includes(key)) {
      // Validate URLs
      try {
        const url = new URL(value, window.location.origin);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          element.setAttribute(key, url.href);
        }
      } catch {
        // Invalid URL, don't set attribute
      }
    }
  }

  return element;
}

/**
 * Validates that a value is a positive integer
 * @param {any} value - The value to validate
 * @returns {boolean} True if valid positive integer
 */
export function isPositiveInteger(value) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
}

/**
 * Validates that a value is within a range
 * @param {number} value - The value to validate
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {boolean} True if within range
 */
export function isInRange(value, min, max) {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
}

// Export all functions as default as well
export default {
  escapeHtml,
  sanitizeAttribute,
  sanitizeEmail,
  sanitizeText,
  sanitizePhone,
  sanitizeZipCode,
  sanitizeProductId,
  sanitizePromoCode,
  sanitizeCurrency,
  createSafeElement,
  isPositiveInteger,
  isInRange
};