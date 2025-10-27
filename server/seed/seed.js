import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Product } from '../src/models/Product.js';
import { PromoCode } from '../src/models/PromoCode.js';
import { products, promoCodes } from './seedData.js';

async function seed() {
  try {
    await connectDatabase();

    for (const product of products) {
      await Product.findOneAndUpdate({ sku: product.sku }, product, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      });
    }
    console.log(`[seed] Upserted ${products.length} products.`);

    for (const promo of promoCodes) {
      await PromoCode.findOneAndUpdate({ code: promo.code }, promo, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      });
    }
    console.log(`[seed] Upserted ${promoCodes.length} promo codes.`);
  } catch (error) {
    console.error('[seed] Failed to seed database', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

seed();
