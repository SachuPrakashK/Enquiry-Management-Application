import assert from 'node:assert/strict';
import test from 'node:test';

import { sendPasswordResetEmail } from '../server/email.ts';

const names = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM'];
const originals = Object.fromEntries(names.map((name) => [name, process.env[name]]));

test.afterEach(() => {
  for (const name of names) {
    if (originals[name] === undefined) delete process.env[name];
    else process.env[name] = originals[name];
  }
});

test('password-reset email requires provider configuration', async () => {
  for (const name of names) delete process.env[name];
  await assert.rejects(
    sendPasswordResetEmail({
      email: 'person@example.com',
      firstName: 'Person',
      resetUrl: 'https://example.com/auth/reset-password?token=secret',
    }),
    (error) => error instanceof Error && error.status === 503,
  );
});

test('password-reset email sends the reset URL through the configured transport', async () => {
  process.env.SMTP_HOST = 'smtp.example.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_SECURE = 'false';
  process.env.SMTP_USER = 'smtp-user';
  process.env.SMTP_PASSWORD = 'smtp-password';
  process.env.EMAIL_FROM = 'EnquiryDesk <no-reply@example.com>';
  let message;
  const transport = { sendMail: async (options) => { message = options; } };

  await sendPasswordResetEmail({
    email: 'person@example.com',
    firstName: 'Person',
    resetUrl: 'https://example.com/auth/reset-password?token=secret',
  }, transport);

  assert.equal(message.to, 'person@example.com');
  assert.equal(message.from, 'EnquiryDesk <no-reply@example.com>');
  assert.match(message.text, /token=secret/);
  assert.doesNotMatch(message.text, /smtp-password/);
});
