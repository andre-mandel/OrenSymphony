import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { getKV, setKV } from './db.ts';
import { signSession, verifySession } from './crypto.ts';
import { env } from './env.ts';

const SESSION_COOKIE = 'orensymphony_session';
const PASSWORD_KEY = 'master_password_hash';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export function hasMasterPassword(): boolean {
  return getKV(PASSWORD_KEY) !== null;
}

export async function setMasterPassword(plain: string): Promise<void> {
  if (plain.length < 8) {
    throw new Error('Master password must be at least 8 characters.');
  }
  const hash = await bcrypt.hash(plain, 12);
  setKV(PASSWORD_KEY, hash);
}

export async function verifyMasterPassword(plain: string): Promise<boolean> {
  const hash = getKV(PASSWORD_KEY);
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function issueSession(res: Response): void {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const token = signSession(JSON.stringify({ sub: 'master', exp: expiresAt }));
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!hasMasterPassword()) {
    res.status(409).json({ error: 'setup_required' });
    return;
  }
  const cookie = req.cookies?.[SESSION_COOKIE];
  if (!cookie) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }
  const payload = verifySession(cookie);
  if (!payload) {
    res.status(401).json({ error: 'invalid_session' });
    return;
  }
  try {
    const { exp } = JSON.parse(payload) as { exp: number };
    if (Date.now() > exp) {
      res.status(401).json({ error: 'session_expired' });
      return;
    }
  } catch {
    res.status(401).json({ error: 'invalid_session' });
    return;
  }
  next();
}
