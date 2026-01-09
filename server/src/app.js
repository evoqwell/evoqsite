import express from 'express';
import cors from 'cors';
import {
  helmetMiddleware,
  generalLimiter,
  authLimiter,
  mongoSanitizeMiddleware,
  sanitizeBody,
  additionalSecurityHeaders
} from './middleware/security.js';
import { csrfProtection, getCsrfToken } from './middleware/csrf.js';
import {
  requireAdmin,
  adminLogin,
  adminLogout,
  refreshToken,
  getSessionInfo
} from './middleware/adminAuth.js';
import productsRouter from './routes/products.js';
import promosRouter from './routes/promos.js';
import ordersRouter from './routes/orders.js';
import adminProductsRouter from './routes/adminProducts.js';
import adminPromosRouter from './routes/adminPromos.js';
import adminOrdersRouter from './routes/adminOrders.js';
import trackingRouter from './routes/tracking.js';
import adminAnalyticsRouter from './routes/adminAnalytics.js';

const app = express();

// Trust proxy headers (Railway uses 1 proxy)
// Set to 1 for Railway, or specific IPs for other deployments
// This enables proper IP detection behind reverse proxies
app.set('trust proxy', 1);

// CORS configuration for production
const allowedOrigins = [
  'https://www.evoqwell.shop',
  'https://evoqwell.shop',
  'https://evoqsite-production.up.railway.app',
  'http://localhost:5173', // Development only
  'http://localhost:3000'  // Development only
];

app.use(
  cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Admin-Token', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

// Security middleware
app.use(helmetMiddleware);
app.use(additionalSecurityHeaders);
app.use(mongoSanitizeMiddleware);
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(sanitizeBody); // Sanitize all request bodies

// Apply general rate limiting to all routes
app.use(generalLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// CSRF token endpoint
app.get('/api/csrf-token', getCsrfToken);

// Admin authentication endpoints
app.post('/api/admin/login', authLimiter, adminLogin);
app.post('/api/admin/logout', requireAdmin, adminLogout);
app.post('/api/admin/refresh-token', requireAdmin, refreshToken);
app.get('/api/admin/session', requireAdmin, getSessionInfo);

app.use('/api/products', productsRouter);
app.use('/api/promos', promosRouter);
// Apply CSRF protection to orders endpoint (state-changing operations)
app.use('/api/orders', csrfProtection, ordersRouter);
app.use('/api/track', trackingRouter);
app.use('/api/admin/products', adminProductsRouter);
app.use('/api/admin/promos', adminPromosRouter);
app.use('/api/admin/orders', adminOrdersRouter);
app.use('/api/admin/analytics', adminAnalyticsRouter);

app.use((err, req, res, next) => {
  console.error('[api] Error:', err);

  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Invalid request payload.', details: err.errors });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Unexpected server error.' });
});

export default app;
