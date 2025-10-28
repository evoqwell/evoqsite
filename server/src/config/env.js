import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = ['MONGODB_URI', 'VENMO_USERNAME'];

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
  admin: {
    accessToken: process.env.ADMIN_ACCESS_TOKEN || ''
  }
};

if (!config.admin.accessToken) {
  console.warn('[config] ADMIN_ACCESS_TOKEN is not set. Admin API endpoints will reject all requests.');
}

export { config };
