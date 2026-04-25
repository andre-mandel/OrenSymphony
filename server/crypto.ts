import crypto from 'node:crypto';
import { env } from './env.ts';

const ALGO = 'aes-256-gcm';

export function encryptSecret(plaintext: string): string {
  if (plaintext === '') return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, env.MASTER_KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(blob: string): string {
  if (!blob) return '';
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, env.MASTER_KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

export function signSession(payload: string): string {
  const mac = crypto
    .createHmac('sha256', env.COOKIE_SIGNING_KEY)
    .update(payload)
    .digest('base64url');
  return `${payload}.${mac}`;
}

export function verifySession(signed: string): string | null {
  const idx = signed.lastIndexOf('.');
  if (idx === -1) return null;
  const payload = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = crypto
    .createHmac('sha256', env.COOKIE_SIGNING_KEY)
    .update(payload)
    .digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return payload;
}

export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
