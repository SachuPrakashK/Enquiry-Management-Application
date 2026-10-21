type PasswordResetEmail = {
  email: string;
  firstName: string;
  resetUrl: string;
};

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
}: PasswordResetEmail): Promise<void> {
  const apiKey = process.env['RESEND_API_KEY'];
  const from = process.env['EMAIL_FROM'];
  if (!apiKey || !from) {
    throw Object.assign(
      new Error('RESEND_API_KEY and EMAIL_FROM are required for password-reset emails.'),
      { status: 503 },
    );
  }

  const name = escapeHtml(firstName || 'there');
  const link = escapeHtml(resetUrl);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Reset your EnquiryDesk password',
      html: `<p>Hello ${name},</p><p>Use the link below to reset your EnquiryDesk password. This link expires in 30 minutes.</p><p><a href="${link}">Reset password</a></p><p>If you did not request this change, you can ignore this email.</p>`,
      text: `Hello ${firstName || 'there'},\n\nReset your EnquiryDesk password using this link (valid for 30 minutes):\n${resetUrl}\n\nIf you did not request this change, you can ignore this email.`,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error(`Password-reset email provider returned ${response.status}: ${detail}`);
    throw Object.assign(new Error('Password-reset email delivery failed.'), { status: 503 });
  }
}
