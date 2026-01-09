import { Router } from 'express';
import { Product } from '../models/Product.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { z } from 'zod';

const router = Router();

router.use(requireAdmin);

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

const productSchema = z.object({
  sku: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional().default(''),
  price: z.number().positive(),
  image: z.string().trim().optional().default(''),
  categories: z.any().optional(),
  category: z.string().trim().optional().default(''),
  coa: z.string().trim().optional().default(''),
  stock: z.number().int().nonnegative().optional().default(0),
  status: z.enum(['active', 'coming_soon', 'inactive']).optional().default('active')
});

const updateSchema = productSchema.partial().extend({
  price: z.number().positive().optional()
});

router.get('/', async (req, res, next) => {
  try {
    const products = await Product.find().sort({ name: 1 }).lean();
    res.json({
      products: products.map((product) => ({
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: Number((product.priceCents / 100).toFixed(2)),
        image: product.image,
        categories: normalizeCategories(
          Array.isArray(product.categories) && product.categories.length
            ? product.categories
            : product.category
        ),
        category: product.category,
        coa: product.coa,
        stock: product.stock,
        status: product.status || 'active'
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const existing = await Product.findOne({ sku: data.sku });
    if (existing) {
      return res.status(409).json({ error: 'Product with this SKU already exists.' });
    }

    const categories = normalizeCategories(data.categories ?? data.category);
    const primaryCategory = categories[0] || data.category || '';

    const product = await Product.create({
      sku: data.sku,
      name: data.name,
      description: data.description,
      priceCents: Math.round(data.price * 100),
      image: data.image,
      categories,
      category: primaryCategory,
      coa: data.coa,
      stock: data.stock,
      status: data.status
    });

    res.status(201).json({
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: Number((product.priceCents / 100).toFixed(2)),
      image: product.image,
      categories: product.categories,
      category: product.category,
      coa: product.coa,
      stock: product.stock,
      status: product.status
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:sku', async (req, res, next) => {
  try {
    const payload = updateSchema.parse(req.body);
    const sku = req.params.sku;

    const update = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        update[key] = value;
      }
    }

    if (typeof update.price === 'number') {
      update.priceCents = Math.round(update.price * 100);
      delete update.price;
    }

    if (update.categories !== undefined) {
      const categories = normalizeCategories(update.categories);
      update.categories = categories;
      const fromPayloadCategory =
        typeof update.category === 'string' ? update.category.trim() : '';
      update.category = categories[0] || fromPayloadCategory || '';
    } else if (update.category !== undefined) {
      update.category = typeof update.category === 'string' ? update.category.trim() : '';
    }

    const product = await Product.findOneAndUpdate(
      { sku },
      { $set: update },
      { new: true }
    ).lean();

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json({
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: Number((product.priceCents / 100).toFixed(2)),
      image: product.image,
      categories: product.categories,
      category: product.category,
      coa: product.coa,
      stock: product.stock,
      status: product.status || 'active'
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:sku', async (req, res, next) => {
  try {
    const sku = req.params.sku;
    const result = await Product.findOneAndDelete({ sku });
    if (!result) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
