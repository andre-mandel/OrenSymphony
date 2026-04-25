import 'dotenv/config';
import crypto from 'node:crypto';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(
      `Missing required env var ${name}. Set it in Coolify (or .env.local for local dev).`,
    );
  }
  return v;
}

function deriveOrLoadMasterKey(): Buffer {
  const raw = process.env.MASTER_KEY;
  if (raw && raw.length > 0) {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length !== 32) {
      throw new Error('MASTER_KEY must decode to exactly 32 bytes (base64-encoded).');
    }
    return buf;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'MASTER_KEY is required in production. Generate one with `openssl rand -base64 32` and set it in Coolify.',
    );
  }
  const fallback = crypto.createHash('sha256').update('orensymphony-dev-only').digest();
  console.warn('[env] MASTER_KEY not set — using insecure dev fallback. Do NOT use in production.');
  return fallback;
}

export const env = {
  PORT: Number(process.env.PORT ?? 8080),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  DATA_DIR: process.env.DATA_DIR ?? './data',
  COOKIE_SIGNING_KEY: process.env.COOKIE_SIGNING_KEY ?? 'orensymphony-dev-cookie',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
  APP_URL: process.env.APP_URL ?? '',
  MASTER_KEY: deriveOrLoadMasterKey(),
};

export function devOnly<T>(fn: () => T): T | undefined {
  return env.NODE_ENV !== 'production' ? fn() : undefined;
}

export { requireEnv };
