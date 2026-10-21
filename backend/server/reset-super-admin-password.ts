import { closeDatabase, query } from './database.ts';
import { hashPassword } from './security.ts';

const identifier = (process.env['SUPER_ADMIN_IDENTIFIER'] || 'admin').trim().toLowerCase();
const password = process.env['RESET_ADMIN_PASSWORD'] || '';

if (!identifier) throw new Error('SUPER_ADMIN_IDENTIFIER is required.');
if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
  throw new Error(
    'RESET_ADMIN_PASSWORD must contain at least 8 characters, including uppercase, lowercase, number, and special character.',
  );
}

try {
  const result = await query<{ email: string; username: string }>(
    `UPDATE admin_users
     SET password_hash = $1, updated_at = now()
     WHERE role = 'Super Admin'
       AND is_active = true
       AND (lower(email) = $2 OR lower(username) = $2)
     RETURNING email, username`,
    [await hashPassword(password), identifier],
  );
  const admin = result.rows[0];
  if (!admin) {
    throw new Error(`No active Super Admin was found for "${identifier}".`);
  }
  process.stdout.write(`Password reset completed for Super Admin ${admin.username} (${admin.email}).\n`);
} finally {
  await closeDatabase();
}
