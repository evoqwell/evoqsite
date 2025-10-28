import { Router } from 'express';
import { Product } from '../models/Product.js';
import { config } from '../config/env.js';

const router = Router();

function normalizeCategories(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

router.get('/', async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ name: 1 }).lean();
    const transformed = products.map((product) => ({
      id: product.sku,
      name: product.name,
      description: product.description,
      image: product.image,
      categories:
        Array.isArray(product.categories) && product.categories.length
          ? product.categories
          : normalizeCategories(product.category),
      category: product.category,
      coa: product.coa,
      stock: product.stock,
      price: Number((product.priceCents / 100).toFixed(2))
    }));
    res.json({
      products: transformed,
      meta: {
        shippingFlatRate: Number((config.shippingFlatRateCents / 100).toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
