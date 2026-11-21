import path from 'node:path';
import dotenv from 'dotenv';
import pino from 'pino';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const CURRENCY = {
  code: 'USD',
  minorUnitFactor: 100,
} as const;

const envSchema = z.object({
  MONGO_URI: z.string().trim().min(1, 'MONGO_URI is required'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const logger = pino();
