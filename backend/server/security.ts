import { createHash, createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(nodeScrypt);
const encoder = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

export type TokenIdentity = { userId: string; role: 'Super Admin' | 'Admin'; exp: number };

function secret(): string {
  const value = process.env['JWT_SECRET'];
  if (!value || value.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
  return value;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString('base64url')}:${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltValue, hashValue] = stored.split(':');
  if (scheme !== 'scrypt' || !saltValue || !hashValue) return false;
  const hash = Buffer.from(hashValue, 'base64url');
  const derived = (await scrypt(password, Buffer.from(saltValue, 'base64url'), hash.length)) as Buffer;
  return hash.length === derived.length && timingSafeEqual(hash, derived);
}

export function signToken(identity: Omit<TokenIdentity, 'exp'>): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + Number(process.env['JWT_EXPIRES_IN_SECONDS'] || 28800) * 1000;
  const header = encoder({ alg: 'HS256', typ: 'JWT' });
  const payload = encoder({ ...identity, exp: Math.floor(expiresAt / 1000) });
  const signature = createHmac('sha256', secret()).update(`${header}.${payload}`).digest('base64url');
  return { token: `${header}.${payload}.${signature}`, expiresAt };
}

export function verifyToken(token: string): TokenIdentity | null {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;
  const expected = createHmac('sha256', secret()).update(`${header}.${payload}`).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const identity = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TokenIdentity;
    if (!identity.userId || !['Super Admin', 'Admin'].includes(identity.role) || identity.exp <= Date.now() / 1000)
      return null;
    return identity;
  } catch {
    return null;
  }
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
