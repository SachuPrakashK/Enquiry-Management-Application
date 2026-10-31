import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';

type PasswordResetEmail = {
  email: string;
  firstName: string;
  resetUrl: string;
};

type EmailTransport = Pick<Transporter, 'sendMail'>;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] || character;
  });

export async function sendPasswordResetEmail({
  email,
  firstName,
  resetUrl,
}: PasswordResetEmail, transport?: EmailTransport): Promise<void> {
  const from = process.env['EMAIL_FROM'];
  if (!emailConfigured() || !from) {
    throw Object.assign(
      new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM are required for password-reset emails.'),
      { status: 503 },
    );
  }

  const name = escapeHtml(firstName || 'there');
  const link = escapeHtml(resetUrl);
  const message: SendMailOptions = {
      from,
      to: email,
      subject: 'Reset your EnquiryDesk password',
      html: `<p>Hello ${name},</p><p>Use the link below to reset your EnquiryDesk password. This link expires in 30 minutes.</p><p><a href="${link}">Reset password</a></p><p>If you did not request this change, you can ignore this email.</p>`,
      text: `Hello ${firstName || 'there'},\n\nReset your EnquiryDesk password using this link (valid for 30 minutes):\n${resetUrl}\n\nIf you did not request this change, you can ignore this email.`,
  };

  try {
    await (transport || createSmtpTransport()).sendMail(message);
  } catch (error) {
    console.error('Password-reset SMTP delivery failed.', error);
    throw Object.assign(new Error('Password-reset email delivery failed.'), { status: 503 });
  }
}

export function emailConfigured(): boolean {
  return ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM'].every(
    (name) => Boolean(process.env[name]?.trim()),
  );
}

function createSmtpTransport(): Transporter {
  const port = Number(process.env['SMTP_PORT']);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw Object.assign(new Error('SMTP_PORT must be a valid port number.'), { status: 503 });
  }
  const secureSetting = process.env['SMTP_SECURE'];
  const secure = secureSetting === undefined ? port === 465 : secureSetting === 'true';
  return nodemailer.createTransport({
    host: process.env['SMTP_HOST'],
    port,
    secure,
    auth: {
      user: process.env['SMTP_USER'],
      pass: process.env['SMTP_PASSWORD'],
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}
