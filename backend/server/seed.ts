import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { closeDatabase, transaction } from './database.ts';
import { hashPassword } from './security.ts';

type JsonRow = Record<string, unknown> & { id?: string };
type SeedData = Record<'statuses' | 'categories' | 'enquiries' | 'followUps' | 'adminUsers', JsonRow[]>;
const data = JSON.parse(await readFile('db.json', 'utf8')) as SeedData;
const adminPassword = process.env['SEED_ADMIN_PASSWORD'];
if (!adminPassword || adminPassword.length < 8) throw new Error('SEED_ADMIN_PASSWORD is required and must be at least 8 characters.');
const passwordHash = await hashPassword(adminPassword);
const nullable = (value: unknown) => value === '' || value === undefined ? null : value;

await transaction(async (client) => {
  for (const row of data.statuses) await client.query(`INSERT INTO statuses (id,name,code,color,description,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`, [row.id || randomUUID(), row.name, row.code, row.color, row.description || '', row.isActive, row.createdAt, row.updatedAt]);
  for (const row of data.categories) await client.query(`INSERT INTO categories (id,name,code,description,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`, [row.id || randomUUID(), row.name, row.code, row.description || '', row.isActive, row.createdAt, row.updatedAt]);
  for (const row of data.adminUsers) await client.query(`INSERT INTO admin_users (id,first_name,last_name,email,username,password_hash,role,is_active,profile_image,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`, [row.id || randomUUID(), row.firstName, row.lastName, row.email, row.username, passwordHash, row.role, row.isActive, nullable(row.profileImage), row.createdAt, row.updatedAt]);
  for (const row of data.enquiries) await client.query(`INSERT INTO enquiries (id,reference_number,customer_name,email,phone,company_name,category_id,subject,message,priority,status_id,preferred_contact_method,source,next_follow_up_date,notes,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (id) DO NOTHING`, [row.id || randomUUID(), row.referenceNumber, row.customerName, row.email, row.phone, row.companyName || '', row.categoryId, row.subject, row.message, row.priority, row.statusId, row.preferredContactMethod, row.source, nullable(row.nextFollowUpDate), row.notes || '', row.createdAt, row.updatedAt]);
  for (const row of data.followUps) {
    if (!(await client.query('SELECT 1 FROM enquiries WHERE id = $1', [row.enquiryId])).rowCount) continue;
    await client.query(`INSERT INTO follow_ups (id,enquiry_id,follow_up_date,follow_up_type,notes,outcome,next_follow_up_date,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`, [row.id || randomUUID(), row.enquiryId, row.followUpDate, row.followUpType, row.notes, row.outcome, nullable(row.nextFollowUpDate), row.createdAt, row.updatedAt]);
  }
});
await closeDatabase();
process.stdout.write('Database seed complete.\n');
