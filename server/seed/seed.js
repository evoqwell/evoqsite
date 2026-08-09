import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Product } from '../src/models/Product.js';
import { PromoCode } from '../src/models/PromoCode.js';
import { products, promoCodes } from './seedData.js';

async function seed() {
  try {
    await connectDatabase();

    for (const product of products) {
      // Stock is live inventory once the store is running — re-seeding must not
      // stomp it back to the placeholder. It is only applied on first insert.
      const { stock, ...fields } = product;
      await Product.findOneAndUpdate(
        { sku: product.sku },
        { $set: fields, $setOnInsert: { stock } },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );
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
