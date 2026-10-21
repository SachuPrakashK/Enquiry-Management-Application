import assert from 'node:assert/strict';
import test from 'node:test';

import { sendPasswordResetEmail } from '../server/email.ts';

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.EMAIL_FROM;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalApiKey;
  if (originalFrom === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = originalFrom;
});

test('password-reset email requires provider configuration', async () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  await assert.rejects(
    sendPasswordResetEmail({
      email: 'person@example.com',
      firstName: 'Person',
      resetUrl: 'https://example.com/auth/reset-password?token=secret',
    }),
    (error) => error instanceof Error && error.status === 503,
  );
});

test('password-reset email sends the reset URL without exposing the API key', async () => {
  process.env.RESEND_API_KEY = 'test-api-key';
  process.env.EMAIL_FROM = 'EnquiryDesk <no-reply@example.com>';
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response('', { status: 200 });
  };

  await sendPasswordResetEmail({
    email: 'person@example.com',
    firstName: 'Person',
    resetUrl: 'https://example.com/auth/reset-password?token=secret',
  });

  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.options.headers.Authorization, 'Bearer test-api-key');
  const body = JSON.parse(request.options.body);
  assert.deepEqual(body.to, ['person@example.com']);
  assert.match(body.text, /token=secret/);
  assert.doesNotMatch(body.text, /test-api-key/);
});
