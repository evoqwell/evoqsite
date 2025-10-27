import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = ['MONGODB_URI', 'VENMO_USERNAME', 'ADMIN_EMAIL', 'FROM_EMAIL'];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.warn(
    `[config] Missing environment variables: ${missing.join(', ')}. ` +
    'Set them in your environment or server/.env file before deploying.'
  );
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  venmoUsername: process.env.VENMO_USERNAME || 'EVOQWELL',
  shippingFlatRateCents: Number(process.env.SHIPPING_FLAT_RATE_CENTS || 1000),
  email: {
    from: process.env.FROM_EMAIL || 'EVOQ Wellness <no-reply@example.com>',
    admin: process.env.ADMIN_EMAIL || ''
  },
  emailjs: {
    serviceId: process.env.EMAILJS_SERVICE_ID || '',
    buyerTemplateId: process.env.EMAILJS_BUYER_TEMPLATE_ID || '',
    adminTemplateId: process.env.EMAILJS_ADMIN_TEMPLATE_ID || '',
    publicKey: process.env.EMAILJS_PUBLIC_KEY || '',
    privateKey: process.env.EMAILJS_PRIVATE_KEY || '',
    accessToken: process.env.EMAILJS_ACCESS_TOKEN || ''
  },
  admin: {
    accessToken: process.env.ADMIN_ACCESS_TOKEN || ''
  }
};

const emailjsRequired = ['EMAILJS_SERVICE_ID', 'EMAILJS_BUYER_TEMPLATE_ID', 'EMAILJS_ADMIN_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY'];
const missingEmailJs = emailjsRequired.filter((key) => !process.env[key]);
if (missingEmailJs.length > 0) {
  console.warn(
    `[config] EmailJS variables missing: ${missingEmailJs.join(', ')}. ` +
    'Transactional emails will be skipped until these are provided.'
  );
}

if (!config.admin.accessToken) {
  console.warn('[config] ADMIN_ACCESS_TOKEN is not set. Admin API endpoints will reject all requests.');
}

export { config };
