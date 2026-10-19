import assert from 'node:assert/strict';

const base = process.env.API_TEST_URL || 'http://127.0.0.1:3101/api';
async function request(path, method = 'GET', payload, token) {
  const response = await fetch(`${base}/${path}`, {
    method,
    headers: { ...(payload ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const body = response.status === 204 ? null : await response.json();
  return { status: response.status, body };
}

const admin = await request('auth/sign-in', 'POST', { identifier: 'admin', password: process.env.SEED_ADMIN_PASSWORD || 'StrongPass1!' });
assert.equal(admin.status, 200);
assert.equal(typeof admin.body.token, 'string');
assert.equal((await request('statuses')).status, 401);
assert.equal((await request('health')).status, 200);
const category = await request('categories', 'POST', { name: 'Smoke Test', code: `SMOKE_${Date.now()}`, description: 'Temporary', isActive: true }, admin.body.token);
assert.equal(category.status, 201);
assert.equal((await request(`categories/${category.body.id}`, 'DELETE', undefined, admin.body.token)).status, 204);
const suffix = Date.now().toString(36);
const registration = await request('auth/register', 'POST', { firstName: 'API', lastName: 'Tester', email: `api.${suffix}@example.com`, username: `api.${suffix}`, password: 'StrongPass1!' });
assert.equal(registration.status, 201);
const regular = await request('auth/sign-in', 'POST', { identifier: `api.${suffix}`, password: 'StrongPass1!' });
assert.equal(regular.status, 200);
assert.equal((await request(`adminUsers/${registration.body.id}`, 'GET', undefined, regular.body.token)).status, 200);
assert.equal((await request('statuses', 'GET', undefined, regular.body.token)).status, 403);
assert.equal((await request(`adminUsers/${registration.body.id}`, 'DELETE', undefined, admin.body.token)).status, 204);
process.stdout.write('Backend smoke test passed.\n');
