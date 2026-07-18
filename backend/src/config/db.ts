import mongoose from 'mongoose';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/**
 * Establishes a single, reused Mongoose connection.
 * Mongoose maintains an internal connection pool, so this is called once at boot.
 */
export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10_000,
    autoIndex: !env.isProduction, // build indexes automatically in dev only
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}
