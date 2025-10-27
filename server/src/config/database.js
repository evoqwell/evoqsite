import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDatabase() {
  if (!config.mongoUri) {
    throw new Error('Missing MONGODB_URI; cannot connect to MongoDB.');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 5000
  });

  console.log('[database] Connected to MongoDB');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  console.log('[database] Disconnected from MongoDB');
}
