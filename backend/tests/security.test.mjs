import { before, test } from 'node:test';
import assert from 'node:assert/strict';

let security;
before(async () => {
  process.env.JWT_SECRET = 'unit-test-secret-that-is-at-least-32-characters';
  security = await import('../server/security.ts');
});

test('password hashes are salted and verifiable', async () => {
  const first = await security.hashPassword('StrongPass1!');
  const second = await security.hashPassword('StrongPass1!');
  assert.notEqual(first, second);
  assert.equal(await security.verifyPassword('StrongPass1!', first), true);
  assert.equal(await security.verifyPassword('incorrect', first), false);
});

test('access tokens reject tampering', () => {
  const signed = security.signToken({ userId: 'u1', role: 'Super Admin' });
  assert.equal(security.verifyToken(signed.token)?.userId, 'u1');
  assert.equal(security.verifyToken(`${signed.token}x`), null);
});
