import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PoolClient, QueryResultRow } from 'pg';
import { query, transaction } from './database.ts';
import {
  hashPassword,
  hashToken,
  randomToken,
  signToken,
  verifyPassword,
  verifyToken,
  type TokenIdentity,
} from './security.ts';

type Row = Record<string, unknown> & { id: string };
type Collection = 'statuses' | 'categories' | 'enquiries' | 'followUps' | 'adminUsers';
type Request = IncomingMessage & { body?: unknown };
const options = {
  priorities: ['Low', 'Medium', 'High', 'Urgent'],
  contactMethods: ['Email', 'Phone', 'WhatsApp'],
  sources: ['Website', 'Phone', 'Email', 'Social Media', 'Referral', 'Other'],
  followUpTypes: ['Call', 'Email', 'WhatsApp', 'Meeting', 'Other'],
};
const configs = {
  statuses: {
    table: 'statuses',
    fields: ['name', 'code', 'color', 'description', 'isActive'],
    columns: ['name', 'code', 'color', 'description', 'is_active'],
  },
  categories: {
    table: 'categories',
    fields: ['name', 'code', 'description', 'isActive'],
    columns: ['name', 'code', 'description', 'is_active'],
  },
  enquiries: {
    table: 'enquiries',
    fields: [
      'customerName',
      'email',
      'phone',
      'companyName',
      'categoryId',
      'subject',
      'message',
      'priority',
      'statusId',
      'preferredContactMethod',
      'source',
      'nextFollowUpDate',
      'notes',
    ],
    columns: [
      'customer_name',
      'email',
      'phone',
      'company_name',
      'category_id',
      'subject',
      'message',
      'priority',
      'status_id',
      'preferred_contact_method',
      'source',
      'next_follow_up_date',
      'notes',
    ],
  },
  followUps: {
    table: 'follow_ups',
    fields: ['enquiryId', 'followUpDate', 'followUpType', 'notes', 'outcome', 'nextFollowUpDate'],
    columns: [
      'enquiry_id',
      'follow_up_date',
      'follow_up_type',
      'notes',
      'outcome',
      'next_follow_up_date',
    ],
  },
  adminUsers: {
    table: 'admin_users',
    fields: ['firstName', 'lastName', 'email', 'username', 'role', 'isActive', 'profileImage'],
    columns: ['first_name', 'last_name', 'email', 'username', 'role', 'is_active', 'profile_image'],
  },
} as const;
const selections: Record<Collection, string> = {
  statuses:
    'id, name, code, color, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"',
  categories:
    'id, name, code, description, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"',
  enquiries:
    'id, reference_number AS "referenceNumber", customer_name AS "customerName", email, phone, company_name AS "companyName", category_id AS "categoryId", subject, message, priority, status_id AS "statusId", preferred_contact_method AS "preferredContactMethod", source, COALESCE(next_follow_up_date::text, \'\') AS "nextFollowUpDate", notes, created_at AS "createdAt", updated_at AS "updatedAt"',
  followUps:
    'id, enquiry_id AS "enquiryId", follow_up_date::text AS "followUpDate", follow_up_type AS "followUpType", notes, outcome, COALESCE(next_follow_up_date::text, \'\') AS "nextFollowUpDate", created_at AS "createdAt", updated_at AS "updatedAt"',
  adminUsers:
    'id, first_name AS "firstName", last_name AS "lastName", email, username, role, is_active AS "isActive", profile_image AS "profileImage", created_at AS "createdAt", updated_at AS "updatedAt"',
};
const fail = (message: string, status = 422): never => {
  throw Object.assign(new Error(message), { status });
};
const value = (row: Record<string, unknown>, key: string) =>
  typeof row[key] === 'string' ? (row[key] as string) : '';
const required = (row: Record<string, unknown>, keys: string[]) =>
  keys.forEach((key) => {
    if (!value(row, key).trim()) fail(`${key} is required.`);
  });
const validPassword = (password: string) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
const dateOnly = (input: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(input) && !Number.isNaN(Date.parse(input));
async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (request.body && typeof request.body === 'object' && !Array.isArray(request.body))
    return request.body as Record<string, unknown>;
  let data = '';
  for await (const chunk of request) {
    data += String(chunk);
    if (data.length > 7_100_000) fail('Request is too large.', 413);
  }
  try {
    const parsed: unknown = JSON.parse(data || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      fail('Invalid JSON body.', 400);
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && 'status' in error) throw error;
    return fail('Invalid JSON body.', 400);
  }
}
function send(response: ServerResponse, status: number, data?: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(data === undefined ? undefined : JSON.stringify(data));
}
async function authenticate(request: Request): Promise<TokenIdentity> {
  const token = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  const identity = token ? verifyToken(token) : null;
  if (!identity) throw Object.assign(new Error('Authentication required.'), { status: 401 });
  const active = await query('SELECT role FROM admin_users WHERE id = $1 AND is_active = true', [
    identity.userId,
  ]);
  if (!active.rowCount || active.rows[0]?.['role'] !== identity.role)
    fail('Authentication required.', 401);
  return identity;
}
async function validate(
  row: Record<string, unknown>,
  collection: Collection,
  client: PoolClient,
  old?: Row,
) {
  if (collection === 'statuses' || collection === 'categories') {
    required(row, ['name', 'code']);
    if (!/^[A-Z][A-Z0-9_]{1,39}$/.test(value(row, 'code')))
      fail('Use 2–40 uppercase letters, numbers or underscores for code.');
    if (typeof row['isActive'] !== 'boolean') fail('Active state is required.');
    if (collection === 'statuses' && !/^#[0-9a-f]{6}$/i.test(value(row, 'color')))
      fail('Select a valid status color.');
  }
  if (collection === 'enquiries') {
    required(row, [
      'customerName',
      'email',
      'phone',
      'categoryId',
      'statusId',
      'subject',
      'message',
      'priority',
      'preferredContactMethod',
      'source',
    ]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value(row, 'email')))
      fail('Enter a valid email address.');
    if (
      !/^\+?[\d\s().-]{7,20}$/.test(value(row, 'phone')) ||
      value(row, 'phone').replace(/\D/g, '').length < 7
    )
      fail('Enter a valid phone number.');
    for (const [key, table] of [
      ['categoryId', 'categories'],
      ['statusId', 'statuses'],
    ] as const) {
      const record = await client.query(`SELECT is_active FROM ${table} WHERE id = $1`, [row[key]]);
      if (!record.rowCount || (!record.rows[0]?.['is_active'] && old?.[key] !== row[key]))
        fail(`Select an active ${table === 'statuses' ? 'status' : 'category'}.`);
    }
    if (!options.priorities.includes(value(row, 'priority'))) fail('Invalid priority.');
    if (!options.sources.includes(value(row, 'source'))) fail('Invalid source.');
    if (!options.contactMethods.includes(value(row, 'preferredContactMethod')))
      fail('Invalid preferredContactMethod.');
  }
  if (collection === 'followUps') {
    required(row, ['enquiryId', 'followUpDate', 'followUpType', 'notes', 'outcome']);
    if (!(await client.query('SELECT 1 FROM enquiries WHERE id = $1', [row['enquiryId']])).rowCount)
      fail('Enquiry not found.', 404);
    if (old && old['enquiryId'] !== row['enquiryId'])
      fail('A follow-up cannot be moved to another enquiry.');
    if (!options.followUpTypes.includes(value(row, 'followUpType')))
      fail('Invalid follow-up type.');
    if (!dateOnly(value(row, 'followUpDate'))) fail('Enter a valid follow-up date.');
    if (row['nextFollowUpDate'] && value(row, 'nextFollowUpDate') < value(row, 'followUpDate'))
      fail('Next follow-up cannot precede the follow-up date.');
  }
  if (collection === 'adminUsers') {
    required(row, ['firstName', 'lastName', 'email', 'username', 'role']);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value(row, 'email')))
      fail('Enter a valid email address.');
    if (!['Super Admin', 'Admin'].includes(value(row, 'role'))) fail('Select a valid role.');
    if (typeof row['isActive'] !== 'boolean') fail('Active state is required.');
    if (old?.id === 'u1' && row['isActive'] === false)
      fail('The primary administrator cannot be deactivated.', 409);
    if (
      row['profileImage'] &&
      (!/^data:image\/(jpeg|png|webp);base64,/.test(value(row, 'profileImage')) ||
        value(row, 'profileImage').length > 7_000_000)
    )
      fail('Choose a valid JPEG, PNG, or WebP profile image no larger than 5 MB.');
  }
  if (row['nextFollowUpDate'] && !dateOnly(value(row, 'nextFollowUpDate')))
    fail('Enter a valid next follow-up date.');
  for (const [key, item] of Object.entries(row))
    if (key !== 'profileImage' && typeof item === 'string' && item.length > 10_000)
      fail('Text is too long.');
}
function dbValues(payload: Record<string, unknown>, collection: Collection) {
  const config = configs[collection];
  return config.fields.map((field) =>
    payload[field] === '' && (field === 'nextFollowUpDate' || field === 'profileImage')
      ? null
      : payload[field],
  );
}
async function reconcile(client: PoolClient, enquiryId: unknown) {
  await client.query(
    `UPDATE enquiries SET next_follow_up_date = (SELECT next_follow_up_date FROM follow_ups WHERE enquiry_id = $1 ORDER BY follow_up_date DESC, created_at DESC LIMIT 1), updated_at = now() WHERE id = $1`,
    [enquiryId],
  );
}
async function authRoute(request: Request, response: ServerResponse, action?: string) {
  const payload = await readBody(request);
  if (request.method !== 'POST') return send(response, 405, { message: 'Method not allowed.' });
  if (action === 'sign-in') {
    const identifier = value(payload, 'identifier').trim().toLowerCase();
    const result = await query<
      QueryResultRow & { id: string; role: 'Super Admin' | 'Admin'; password_hash: string }
    >(
      'SELECT id, role, password_hash FROM admin_users WHERE (lower(email) = $1 OR lower(username) = $1) AND is_active = true',
      [identifier],
    );
    const user = result.rows[0];
    if (!user || !(await verifyPassword(value(payload, 'password'), user.password_hash)))
      return send(response, 401, { message: 'The email, username, or password is incorrect.' });
    return send(response, 200, {
      userId: user.id,
      role: user.role,
      ...signToken({ userId: user.id, role: user.role }),
    });
  }
  if (action === 'check-availability') {
    required(payload, ['email', 'username']);
    const email = value(payload, 'email').trim().toLowerCase();
    const username = value(payload, 'username').trim().toLowerCase();
    const result = await query<{ email_exists: boolean; username_exists: boolean }>(
      `SELECT
         EXISTS (SELECT 1 FROM admin_users WHERE lower(email) = $1) AS email_exists,
         EXISTS (SELECT 1 FROM admin_users WHERE lower(username) = $2) AS username_exists`,
      [email, username],
    );
    const availability = result.rows[0];
    return send(response, 200, {
      emailAvailable: !availability?.email_exists,
      usernameAvailable: !availability?.username_exists,
    });
  }
  if (action === 'register') {
    required(payload, ['firstName', 'lastName', 'email', 'username', 'password']);
    if (!validPassword(value(payload, 'password')))
      fail('Password does not meet the requirements.');
    const row = { ...payload, role: 'Admin', isActive: true };
    return transaction(async (client) => {
      await validate(row, 'adminUsers', client);
      const duplicate = await client.query<{ email: string; username: string }>(
        `SELECT email, username FROM admin_users
         WHERE lower(email) = lower($1) OR lower(username) = lower($2)
         LIMIT 1`,
        [value(payload, 'email').trim(), value(payload, 'username').trim()],
      );
      const existing = duplicate.rows[0];
      if (existing?.email.toLowerCase() === value(payload, 'email').trim().toLowerCase()) {
        fail('An account with this email already exists.', 409);
      }
      if (existing?.username.toLowerCase() === value(payload, 'username').trim().toLowerCase()) {
        fail('This username is already in use.', 409);
      }
      const passwordHash = await hashPassword(value(payload, 'password'));
      const result = await client.query(
        `INSERT INTO admin_users (id, first_name, last_name, email, username, password_hash, role, is_active) VALUES ($1,$2,$3,lower($4),$5,$6,'Admin',true) RETURNING ${selections.adminUsers}`,
        [
          randomUUID(),
          value(payload, 'firstName').trim(),
          value(payload, 'lastName').trim(),
          value(payload, 'email').trim(),
          value(payload, 'username').trim(),
          passwordHash,
        ],
      );
      send(response, 201, result.rows[0]);
    });
  }
  if (action === 'forgot-password') {
    const email = value(payload, 'email').trim().toLowerCase();
    const user = (
      await query('SELECT id FROM admin_users WHERE lower(email) = $1 AND is_active = true', [
        email,
      ])
    ).rows[0];
    if (user) {
      const token = randomToken();
      await query(
        "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1,$2,$3,now() + interval '30 minutes')",
        [randomUUID(), user['id'], hashToken(token)],
      );
      if (process.env['NODE_ENV'] !== 'production')
        process.stdout.write(`Password reset token for ${email}: ${token}\n`);
    }
    return send(response, 204);
  }
  if (action === 'reset-password') {
    const password = value(payload, 'password');
    if (!validPassword(password)) fail('Password does not meet the requirements.');
    const tokenHash = hashToken(value(payload, 'token'));
    return transaction(async (client) => {
      const token = await client.query(
        'SELECT id, user_id FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() FOR UPDATE',
        [tokenHash],
      );
      if (!token.rowCount) fail('This password reset link is invalid or expired.', 400);
      await client.query(
        'UPDATE admin_users SET password_hash = $1, updated_at = now() WHERE id = $2',
        [await hashPassword(password), token.rows[0]?.['user_id']],
      );
      await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [
        token.rows[0]?.['id'],
      ]);
      send(response, 204);
    });
  }
  return send(response, 404, { message: 'Endpoint not found.' });
}
export async function handleApi(request: Request, response: ServerResponse): Promise<void> {
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    const rewrittenPath = url.searchParams.get('path');
    const segments = rewrittenPath
      ? ['api', ...rewrittenPath.split('/').filter(Boolean)]
      : url.pathname.split('/').filter(Boolean);
    if (segments[0] === 'api') segments.shift();
    const [name, id, extra] = segments;
    if (!name && request.method === 'GET') {
      return send(response, 200, {
        name: 'Inquiry Management API',
        status: 'running',
        health: '/api/health',
      });
    }
    if (name === 'health' && request.method === 'GET') {
      await query('SELECT 1');
      return send(response, 200, { status: 'ok' });
    }
    if (name === 'auth') return await authRoute(request, response, id);
    const identity = await authenticate(request);
    if (extra) return send(response, 404, { message: 'Endpoint not found.' });
    if (name === 'options' && request.method === 'GET') return send(response, 200, options);
    if (!Object.hasOwn(configs, name || ''))
      return send(response, 404, { message: 'Collection not found.' });
    const collection = name as Collection;
    if (identity.role !== 'Super Admin') {
      if (collection === 'statuses' || collection === 'categories')
        fail('You do not have permission to perform this action.', 403);
      if (
        collection === 'adminUsers' &&
        (id !== identity.userId || !['GET', 'PATCH', 'PUT'].includes(request.method || ''))
      )
        fail('You do not have permission to perform this action.', 403);
    }
    const config = configs[collection];
    if (request.method === 'GET') {
      const filters: string[] = [];
      const values: string[] = [];
      for (const [key, filterValue] of url.searchParams) {
        const index = config.fields.indexOf(key as never);
        if (index >= 0) {
          values.push(filterValue);
          filters.push(`${config.columns[index]}::text = $${values.length}`);
        }
      }
      if (id) {
        values.push(id);
        filters.push(`id = $${values.length}`);
      }
      const result = await query(
        `SELECT ${selections[collection]} FROM ${config.table}${filters.length ? ` WHERE ${filters.join(' AND ')}` : ''} ORDER BY created_at ASC`,
        values,
      );
      return id
        ? send(
            response,
            result.rowCount ? 200 : 404,
            result.rows[0] || { message: 'Record not found.' },
          )
        : send(response, 200, result.rows);
    }
    const payload = request.method === 'DELETE' ? {} : await readBody(request);
    await transaction(async (client) => {
      const current = id
        ? (
            await client.query<Row>(
              `SELECT ${selections[collection]} FROM ${config.table} WHERE id = $1 FOR UPDATE`,
              [id],
            )
          ).rows[0]
        : undefined;
      if (request.method === 'POST' && !id) {
        const row: Record<string, unknown> = { ...payload };
        await validate(row, collection, client);
        const columns = [...config.columns] as string[];
        const values = dbValues(row, collection);
        if (collection === 'adminUsers') {
          const password = value(payload, 'password');
          if (!validPassword(password)) fail('Password does not meet the requirements.');
          columns.push('password_hash');
          values.push(await hashPassword(password));
        }
        if (collection === 'enquiries') {
          const year = new Date().getUTCFullYear();
          await client.query('SELECT pg_advisory_xact_lock($1)', [year]);
          const max = await client.query(
            `SELECT COALESCE(MAX(substring(reference_number from 10)::int), 0) AS value FROM enquiries WHERE reference_number LIKE $1`,
            [`ENQ-${year}-%`],
          );
          columns.push('reference_number');
          values.push(`ENQ-${year}-${String(Number(max.rows[0]?.['value']) + 1).padStart(4, '0')}`);
        }
        const params = [randomUUID(), ...values];
        const result = await client.query(
          `INSERT INTO ${config.table} (id, ${columns.join(', ')}) VALUES (${params.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING ${selections[collection]}`,
          params,
        );
        if (collection === 'followUps') await reconcile(client, row['enquiryId']);
        return send(response, 201, result.rows[0]);
      }
      if (!id || !current) return send(response, 404, { message: 'Record not found.' });
      if (request.method === 'PATCH' || request.method === 'PUT') {
        if (collection === 'adminUsers' && identity.role !== 'Super Admin') {
          payload['role'] = current['role'];
          payload['isActive'] = current['isActive'];
        }
        const row: Row = { ...current, ...payload, id: current.id };
        if (collection === 'enquiries') row['referenceNumber'] = current['referenceNumber'];
        await validate(row, collection, client, current);
        const updates: string[] = [];
        const values: unknown[] = [];
        config.fields.forEach((field, index) => {
          if (Object.hasOwn(payload, field)) {
            values.push(
              payload[field] === '' && (field === 'nextFollowUpDate' || field === 'profileImage')
                ? null
                : payload[field],
            );
            updates.push(`${config.columns[index]} = $${values.length}`);
          }
        });
        if (collection === 'adminUsers' && typeof payload['password'] === 'string') {
          if (!validPassword(payload['password'])) fail('Password does not meet the requirements.');
          values.push(await hashPassword(payload['password']));
          updates.push(`password_hash = $${values.length}`);
        }
        if (!updates.length) return send(response, 200, current);
        values.push(id);
        const result = await client.query(
          `UPDATE ${config.table} SET ${updates.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING ${selections[collection]}`,
          values,
        );
        if (collection === 'followUps') await reconcile(client, row['enquiryId']);
        return send(response, 200, result.rows[0]);
      }
      if (request.method === 'DELETE') {
        if (collection === 'adminUsers' && current.id === 'u1')
          fail('The primary administrator cannot be deleted.', 409);
        if (collection === 'statuses' || collection === 'categories') {
          const field = collection === 'statuses' ? 'status_id' : 'category_id';
          if (
            (await client.query(`SELECT 1 FROM enquiries WHERE ${field} = $1 LIMIT 1`, [id]))
              .rowCount
          )
            fail('This record is used by enquiries. Deactivate it instead.', 409);
        }
        await client.query(`DELETE FROM ${config.table} WHERE id = $1`, [id]);
        if (collection === 'followUps') await reconcile(client, current['enquiryId']);
        return send(response, 204);
      }
      return send(response, 405, { message: 'Method not allowed.' });
    });
  } catch (error: unknown) {
    const pgCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    const missingDatabase = error instanceof Error && error.message === 'DATABASE_URL is required.';
    const status =
      missingDatabase
        ? 503
        : pgCode === '23505'
        ? 409
        : error instanceof Error && 'status' in error && typeof error.status === 'number'
          ? error.status
          : 500;
    if (status === 500) console.error(error);
    send(response, status, {
      message:
        missingDatabase
          ? 'The database is not configured for this deployment. Add DATABASE_URL in Vercel and redeploy.'
          : status === 500
          ? 'The server could not complete the request.'
          : pgCode === '23505'
            ? 'A record with these unique details already exists.'
            : error instanceof Error
              ? error.message
              : 'Request failed.',
    });
  }
}
