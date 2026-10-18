import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const directory = resolve('.test-output');
const file = resolve(directory, 'api-db.json');
const base = 'http://127.0.0.1:3101/api';
let server;
async function request(resource, method = 'GET', payload) {
  const response = await fetch(`${base}/${resource}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}
async function start() {
  server = spawn(process.execPath, ['server/api.ts'], {
    env: { ...process.env, PORT: '3101', DB_FILE: file },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('API startup timed out')), 10000);
    server.stdout.once('data', () => {
      clearTimeout(timeout);
      resolve();
    });
    server.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`API exited: ${code}`));
    });
  });
}
async function stop() {
  if (server && server.exitCode === null)
    await new Promise((resolve) => {
      server.once('exit', resolve);
      server.kill();
    });
}
before(async () => {
  mkdirSync(directory, { recursive: true });
  copyFileSync('db.json', file);
  await start();
});
after(stop);
test('master CRUD, uniqueness, activation, and relationship protection', async () => {
  for (const kind of ['statuses', 'categories']) {
    const payload = {
      name: `Test ${kind}`,
      code: `TEST_${kind.toUpperCase()}`,
      description: 'Test record',
      isActive: true,
      ...(kind === 'statuses' ? { color: '#336699' } : {}),
    };
    const created = await request(kind, 'POST', payload);
    assert.equal(created.status, 201);
    assert.equal((await request(kind, 'POST', payload)).status, 409);
    const updated = await request(`${kind}/${created.body.id}`, 'PATCH', {
      name: `Updated ${kind}`,
      isActive: false,
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.isActive, false);
    assert.equal(
      JSON.parse(readFileSync(file, 'utf8'))[kind].find((row) => row.id === created.body.id)
        .isActive,
      false,
    );
    assert.equal((await request(`${kind}/${created.body.id}`, 'DELETE')).status, 204);
    assert.equal((await request(`${kind}/${created.body.id}`)).status, 404);
  }
  assert.equal((await request('statuses/s1', 'DELETE')).status, 409);
  assert.equal((await request('categories/c1', 'DELETE')).status, 409);
});
test('enquiry persistence, stable identity, status changes, follow-up reconciliation, and cascade delete', async () => {
  const sample = (await request('enquiries/i1')).body;
  const created = await request('enquiries', 'POST', {
    ...sample,
    customerName: 'Integration Customer',
  });
  assert.equal(created.status, 201);
  assert.notEqual(created.body.referenceNumber, sample.referenceNumber);
  const id = created.body.id;
  const edited = await request(`enquiries/${id}`, 'PATCH', {
    subject: 'Updated scope',
    statusId: 's3',
    id: 'fake',
    referenceNumber: 'fake',
    createdAt: 'fake',
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.id, id);
  assert.equal(edited.body.referenceNumber, created.body.referenceNumber);
  assert.equal(edited.body.createdAt, created.body.createdAt);
  assert.equal(edited.body.statusId, 's3');
  await stop();
  await start();
  assert.equal((await request(`enquiries/${id}`)).body.subject, 'Updated scope');
  const follow = await request('followUps', 'POST', {
    enquiryId: id,
    followUpDate: '2026-09-24',
    followUpType: 'Call',
    notes: 'Discussed requirements',
    outcome: 'Proposal requested',
    nextFollowUpDate: '2026-09-27',
  });
  assert.equal(follow.status, 201);
  assert.equal((await request(`enquiries/${id}`)).body.nextFollowUpDate, '2026-09-27');
  assert.equal(
    (await request(`followUps/${follow.body.id}`, 'PATCH', { nextFollowUpDate: '2026-09-28' }))
      .status,
    200,
  );
  assert.equal((await request(`enquiries/${id}`)).body.nextFollowUpDate, '2026-09-28');
  assert.equal((await request(`followUps/${follow.body.id}`, 'DELETE')).status, 204);
  assert.equal((await request(`enquiries/${id}`)).body.nextFollowUpDate, '');
  await request('followUps', 'POST', {
    enquiryId: id,
    followUpDate: '2026-09-24',
    followUpType: 'Email',
    notes: 'Final proposal',
    outcome: 'Completed',
    nextFollowUpDate: '',
  });
  assert.equal((await request(`enquiries/${id}`, 'DELETE')).status, 204);
  assert.equal((await request(`followUps?enquiryId=${id}`)).body.length, 0);
});
test('validation and simultaneous enquiry creation', async () => {
  assert.equal((await request('enquiries', 'POST', {})).status, 422);
  const sample = (await request('enquiries/i1')).body;
  assert.equal((await request('enquiries', 'POST', { ...sample, email: 'invalid' })).status, 422);
  await request('categories/c1', 'PATCH', { isActive: false });
  assert.equal((await request('enquiries', 'POST', sample)).status, 422);
  assert.equal((await request('enquiries/i1', 'PATCH', { subject: sample.subject })).status, 200);
  await request('categories/c1', 'PATCH', { isActive: true });
  const results = await Promise.all(
    Array.from({ length: 4 }, () => request('enquiries', 'POST', sample)),
  );
  assert.ok(results.every((result) => result.status === 201));
  assert.equal(new Set(results.map((result) => result.body.referenceNumber)).size, 4);
  for (const result of results) await request(`enquiries/${result.body.id}`, 'DELETE');
});
test('admin user CRUD enforces identity uniqueness and protects the primary administrator', async () => {
  const payload = {
    firstName: 'Test',
    lastName: 'Administrator',
    email: 'test.admin@example.com',
    username: 'test.admin',
    role: 'Admin',
    isActive: true,
  };
  const created = await request('adminUsers', 'POST', payload);
  assert.equal(created.status, 201);
  assert.equal(created.body.role, 'Admin');
  assert.equal(Object.hasOwn(created.body, 'password'), false);
  assert.equal(
    (await request('adminUsers', 'POST', { ...payload, username: 'another' })).status,
    409,
  );
  const updated = await request(`adminUsers/${created.body.id}`, 'PATCH', {
    firstName: 'Updated',
    isActive: false,
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.firstName, 'Updated');
  assert.equal(updated.body.isActive, false);
  assert.equal((await request(`adminUsers/${created.body.id}`, 'DELETE')).status, 204);
  assert.equal((await request('adminUsers/u1', 'PATCH', { isActive: false })).status, 409);
  assert.equal((await request('adminUsers/u1', 'DELETE')).status, 409);
});
test('registered admin users persist securely and can sign in', async () => {
  const payload = {
    firstName: 'Registered',
    lastName: 'Administrator',
    email: 'registered.admin@example.com',
    username: 'registered.admin',
    password: 'StrongPass1!',
    role: 'Admin',
    isActive: true,
  };
  const created = await request('adminUsers', 'POST', payload);
  assert.equal(created.status, 201);
  assert.equal(created.body.role, 'Admin');
  assert.equal(Object.hasOwn(created.body, 'password'), false);
  assert.equal(Object.hasOwn(created.body, 'passwordHash'), false);
  const persisted = JSON.parse(readFileSync(file, 'utf8')).adminUsers.find(
    (user) => user.id === created.body.id,
  );
  assert.equal(Object.hasOwn(persisted, 'password'), false);
  assert.equal(typeof persisted.passwordHash, 'string');
  assert.notEqual(persisted.passwordHash, payload.password);
  const signedIn = await request('auth/sign-in', 'POST', {
    identifier: payload.email,
    password: payload.password,
  });
  assert.equal(signedIn.status, 200);
  assert.equal(signedIn.body.userId, created.body.id);
  await request(`adminUsers/${created.body.id}`, 'DELETE');
});
