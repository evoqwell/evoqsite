import crypto from 'crypto';
import { config } from '../config/env.js';

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Derive encryption key from secret
function deriveKey(secret, salt) {
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
}

// Get encryption key (uses JWT secret or admin token as base)
function getEncryptionKey() {
  const secret = config.admin.jwtSecret || config.admin.accessToken || 'default-encryption-key';
  // Use a fixed salt for key derivation (stored separately or derived from secret)
  const salt = crypto.createHash('sha256').update(secret).digest().slice(0, SALT_LENGTH);
  return deriveKey(secret, salt);
}

/**
 * Encrypt a string value
 * @param {string} plaintext - The value to encrypt
 * @returns {string} - Base64 encoded encrypted value with IV and auth tag
 */
export function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  if (typeof plaintext !== 'string') {
    plaintext = String(plaintext);
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]);

    return `enc:${combined.toString('base64')}`;
  } catch (error) {
    console.error('[encryption] Encryption failed:', error.message);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt a string value
 * @param {string} encryptedText - The encrypted value (with enc: prefix)
 * @returns {string} - Decrypted plaintext
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;

  // Check if the value is encrypted
  if (typeof encryptedText !== 'string' || !encryptedText.startsWith('enc:')) {
    return encryptedText; // Return as-is if not encrypted
  }

  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedText.slice(4), 'base64');

    // Extract IV, authTag, and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[encryption] Decryption failed:', error.message);
    throw new Error('Decryption failed');
  }
}

/**
 * Check if a value is encrypted
 * @param {string} value - The value to check
 * @returns {boolean} - True if the value is encrypted
 */
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith('enc:');
}

/**
 * Encrypt PII fields in an object
 * @param {object} obj - Object containing PII fields
 * @param {string[]} fields - Array of field names to encrypt
 * @returns {object} - Object with encrypted fields
 */
export function encryptPiiFields(obj, fields) {
  if (!obj) return obj;

  const result = { ...obj };
  for (const field of fields) {
    if (result[field] && !isEncrypted(result[field])) {
      result[field] = encrypt(result[field]);
    }
  }
  return result;
}

/**
 * Decrypt PII fields in an object
 * @param {object} obj - Object containing encrypted PII fields
 * @param {string[]} fields - Array of field names to decrypt
 * @returns {object} - Object with decrypted fields
 */
export function decryptPiiFields(obj, fields) {
  if (!obj) return obj;

  const result = { ...obj };
  for (const field of fields) {
    if (result[field] && isEncrypted(result[field])) {
      result[field] = decrypt(result[field]);
    }
  }
  return result;
}

// List of PII fields in customer data
export const CUSTOMER_PII_FIELDS = [
  'name',
  'email',
  'phone',
  'address',
  'city',
  'state',
  'zip'
];

/**
 * Encrypt customer data
 * @param {object} customer - Customer object
 * @returns {object} - Customer object with encrypted PII
 */
export function encryptCustomerData(customer) {
  return encryptPiiFields(customer, CUSTOMER_PII_FIELDS);
}

/**
 * Decrypt customer data
 * @param {object} customer - Customer object with encrypted PII
 * @returns {object} - Customer object with decrypted PII
 */
export function decryptCustomerData(customer) {
  return decryptPiiFields(customer, CUSTOMER_PII_FIELDS);
}

export default {
  encrypt,
  decrypt,
  isEncrypted,
  encryptPiiFields,
  decryptPiiFields,
  encryptCustomerData,
  decryptCustomerData,
  CUSTOMER_PII_FIELDS
};
