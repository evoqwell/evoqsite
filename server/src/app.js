import express from 'express';
import cors from 'cors';
import productsRouter from './routes/products.js';
import promosRouter from './routes/promos.js';
import ordersRouter from './routes/orders.js';
import adminProductsRouter from './routes/adminProducts.js';
import adminPromosRouter from './routes/adminPromos.js';
import adminOrdersRouter from './routes/adminOrders.js';

const app = express();

app.use(
  cors({
    origin: true,
    credentials: false,
    allowedHeaders: ['Content-Type', 'X-Admin-Token']
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/products', productsRouter);
app.use('/api/promos', promosRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin/products', adminProductsRouter);
app.use('/api/admin/promos', adminPromosRouter);
app.use('/api/admin/orders', adminOrdersRouter);

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
