import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().min(16).default('pulsechat_jwt_secret_key_minimum_32_chars_long_prod!'),
  JWT_REFRESH_SECRET: z.string().min(16).default('pulsechat_jwt_refresh_secret_key_minimum_32_chars!'),
  // 32-byte hex or string for AES-256-GCM session storage encryption
  SESSION_ENCRYPTION_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  MAX_MESSAGES_PER_MINUTE: z.string().default('30').transform(Number),
  MESSAGE_COOLDOWN_SECONDS: z.string().default('2').transform(Number)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
