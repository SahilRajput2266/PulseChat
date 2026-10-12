import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env';
import { logger } from '../utils/logger';

let mongoMemoryServer: MongoMemoryServer | null = null;

export async function connectDatabase(): Promise<void> {
  let uri = env.MONGODB_URI;

  if (!uri) {
    logger.info('No external MONGODB_URI configured. Starting embedded MongoDB Server with persistent disk storage...');
    const path = await import('path');
    const fs = await import('fs');
    const dbDir = path.resolve(process.cwd(), '.db_data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    mongoMemoryServer = await MongoMemoryServer.create({
      instance: {
        dbPath: dbDir,
        storageEngine: 'wiredTiger'
      }
    });
    uri = mongoMemoryServer.getUri();
    logger.info(`Embedded MongoDB Server started with persistent storage at ${dbDir}`);
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    });
    logger.info('Connected to MongoDB database');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to MongoDB');
    // If external URI failed, try memory server fallback in non-production
    if (env.NODE_ENV !== 'production' && !mongoMemoryServer) {
      logger.warn('Attempting fallback to embedded MongoDB Memory Server...');
      mongoMemoryServer = await MongoMemoryServer.create();
      uri = mongoMemoryServer.getUri();
      await mongoose.connect(uri);
      logger.info('Connected to embedded MongoDB fallback');
      return;
    }
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
  logger.info('Disconnected from MongoDB');
}
