import mongoose from 'mongoose';
import { env, logger } from '../config/env';

export async function connectDB(uri: string = env.MONGO_URI): Promise<typeof mongoose> {
  const conn = await mongoose.connect(uri);
  logger.info({ host: conn.connection.host, db: conn.connection.name }, 'Connected to MongoDB');
  return conn;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info('Disconnected from MongoDB');
}
