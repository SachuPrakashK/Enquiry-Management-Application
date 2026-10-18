import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

type Row = Record<string, unknown> & { id: string };
type Database = {
  statuses: Row[];
  categories: Row[];
  enquiries: Row[];
  followUps: Row[];
  adminUsers: Row[];
  options: Record<string, string[]>;
};
type Collection = 'statuses' | 'categories' | 'enquiries' | 'followUps' | 'adminUsers';
const collections: Collection[] = [
  'statuses',
  'categories',
  'enquiries',
  'followUps',
  'adminUsers',
];
const databasePath = resolve(process.env['DB_FILE'] || 'db.json');
let database = JSON.parse(readFileSync(databasePath, 'utf8')) as Database;
const fail = (message: string, status = 422): never => {
  throw Object.assign(new Error(message), { status });
};
const string = (row: Row, key: string): string =>
  typeof row[key] === 'string' ? (row[key] as string) : '';
const passwordHash = (value: string) => createHash('sha256').update(value).digest('hex');
const publicRow = (row: Row): Row => {
  const { passwordHash: _, ...visible } = row;
  return visible as Row;
};
const required = (row: Row, keys: string[]) =>
  keys.forEach((key) => {
    if (!string(row, key).trim()) fail(`${key} is required.`);
  });
const dateOnly = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
function validate(row: Row, collection: Collection, old?: Row) {
  if (collection === 'statuses' || collection === 'categories') {
    required(row, ['name', 'code']);
    if (!/^[A-Z][A-Z0-9_]{1,39}$/.test(string(row, 'code')))
      fail('Use 2–40 uppercase letters, numbers or underscores for code.');
    if (typeof row['isActive'] !== 'boolean') fail('Active state is required.');
    if (
      database[collection].some(
        (item) =>
          item.id !== row.id &&
          (string(item, 'code') === string(row, 'code') ||
            string(item, 'name').toLowerCase() === string(row, 'name').toLowerCase()),
      )
    )
      fail('A record with this name or code already exists.', 409);
    if (collection === 'statuses' && !/^#[0-9a-f]{6}$/i.test(string(row, 'color')))
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(string(row, 'email')))
      fail('Enter a valid email address.');
    if (
      !/^\+?[\d\s().-]{7,20}$/.test(string(row, 'phone')) ||
      string(row, 'phone').replace(/\D/g, '').length < 7
    )
      fail('Enter a valid phone number.');
    for (const [key, master] of [
      ['categoryId', 'categories'],
      ['statusId', 'statuses'],
    ] as const) {
      const record = database[master].find((item) => item.id === row[key]);
      if (!record || (!record['isActive'] && old?.[key] !== row[key]))
        fail(`Select an active ${master === 'statuses' ? 'status' : 'category'}.`);
    }
    for (const [key, option] of [
      ['priority', 'priorities'],
      ['source', 'sources'],
      ['preferredContactMethod', 'contactMethods'],
    ] as const) {
      if (!database.options[option]?.includes(string(row, key))) fail(`Invalid ${key}.`);
    }
  }
  if (collection === 'followUps') {
    required(row, ['enquiryId', 'followUpDate', 'followUpType', 'notes', 'outcome']);
    if (!database.enquiries.some((item) => item.id === row['enquiryId']))
      fail('Enquiry not found.', 404);
    if (old && old['enquiryId'] !== row['enquiryId'])
      fail('A follow-up cannot be moved to another enquiry.');
    if (!database.options['followUpTypes']?.includes(string(row, 'followUpType')))
      fail('Invalid follow-up type.');
    if (!dateOnly(string(row, 'followUpDate'))) fail('Enter a valid follow-up date.');
    if (row['nextFollowUpDate'] && string(row, 'nextFollowUpDate') < string(row, 'followUpDate'))
      fail('Next follow-up cannot precede the follow-up date.');
  }
  if (collection === 'adminUsers') {
    required(row, ['firstName', 'lastName', 'email', 'username', 'role']);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(string(row, 'email')))
      fail('Enter a valid email address.');
    if (!['Super Admin', 'Admin'].includes(string(row, 'role'))) fail('Select a valid role.');
    if (typeof row['isActive'] !== 'boolean') fail('Active state is required.');
    if (old?.id === 'u1' && row['isActive'] === false)
      fail('The primary demo administrator cannot be deactivated.', 409);
    if (
      database.adminUsers.some(
        (item) =>
          item.id !== row.id &&
          string(item, 'email').toLowerCase() === string(row, 'email').toLowerCase(),
      )
    )
      fail('An account with this email already exists.', 409);
    if (
      database.adminUsers.some(
        (item) =>
          item.id !== row.id &&
          string(item, 'username').toLowerCase() === string(row, 'username').toLowerCase(),
      )
    )
      fail('This username is already in use.', 409);
    if (
      row['profileImage'] &&
      (!/^data:image\/(jpeg|png|webp);base64,/.test(string(row, 'profileImage')) ||
        string(row, 'profileImage').length > 7000000)
    )
      fail('Choose a valid JPEG, PNG, or WebP profile image no larger than 5 MB.');
  }
  if (row['nextFollowUpDate'] && !dateOnly(string(row, 'nextFollowUpDate')))
    fail('Enter a valid next follow-up date.');
  for (const [key, value] of Object.entries(row))
    if (key !== 'profileImage' && typeof value === 'string' && value.length > 10000)
      fail('Text is too long.');
}
function persist(next: Database) {
  writeFileSync(`${databasePath}.tmp`, JSON.stringify(next, null, 2) + '\n');
  renameSync(`${databasePath}.tmp`, databasePath);
  database = next;
}
function reconcile(next: Database, enquiryId: unknown) {
  const enquiry = next.enquiries.find((item) => item.id === enquiryId);
  if (!enquiry) return;
  const history = next.followUps
    .filter((item) => item['enquiryId'] === enquiryId)
    .sort((a, b) =>
      `${b['followUpDate']}${b['createdAt']}`.localeCompare(
        `${a['followUpDate']}${a['createdAt']}`,
      ),
    );
  enquiry['nextFollowUpDate'] = history[0]?.['nextFollowUpDate'] || '';
  enquiry['updatedAt'] = new Date().toISOString();
}
async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  let data = '';
  for await (const chunk of request) {
    data += String(chunk);
    if (data.length > 7100000) fail('Request is too large.', 413);
  }
  try {
    const parsed: unknown = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return fail('Invalid JSON body.', 400);
    return parsed as Record<string, unknown>;
  } catch {
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
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments[0] === 'api') segments.shift();
    const [name, id, extra] = segments;
    if (name === 'auth' && request.method === 'POST' && id && !extra) {
      const payload = await body(request);
      if (id === 'sign-in') {
        const identifier =
          typeof payload['identifier'] === 'string'
            ? payload['identifier'].trim().toLowerCase()
            : '';
        const password = typeof payload['password'] === 'string' ? payload['password'] : '';
        const user = database.adminUsers.find((item) =>
          [string(item, 'username').toLowerCase(), string(item, 'email').toLowerCase()].includes(
            identifier,
          ),
        );
        if (!user || !user['isActive'] || string(user, 'passwordHash') !== passwordHash(password))
          return send(response, 401, { message: 'The email, username, or password is incorrect.' });
        return send(response, 200, { userId: user.id, role: user['role'] });
      }
      if (id === 'forgot-password' || id === 'reset-password') return send(response, 204);
      return send(response, 404, { message: 'Endpoint not found.' });
    }
    if (extra) return send(response, 404, { message: 'Endpoint not found.' });
    if (name === 'options' && request.method === 'GET')
      return send(response, 200, database.options);
    if (!collections.includes(name as Collection))
      return send(response, 404, { message: 'Collection not found.' });
    const collection = name as Collection;
    if (request.method === 'GET') {
      if (id) {
        const row = database[collection].find((item) => item.id === id);
        return row
          ? send(response, 200, collection === 'adminUsers' ? publicRow(row) : row)
          : send(response, 404, { message: 'Record not found.' });
      }
      return send(
        response,
        200,
        database[collection]
          .filter((item) =>
            [...url.searchParams].every(([key, value]) => String(item[key]) === value),
          )
          .map((item) => (collection === 'adminUsers' ? publicRow(item) : item)),
      );
    }
    const payload = request.method === 'DELETE' ? {} : await body(request);
    const next = structuredClone(database);
    const rows = next[collection];
    const index = rows.findIndex((item) => item.id === id);
    const now = new Date().toISOString();
    if (request.method === 'POST' && !id) {
      const { password, ...safePayload } = payload;
      const row: Row = { ...safePayload, id: randomUUID(), createdAt: now, updatedAt: now };
      if (collection === 'adminUsers' && typeof password === 'string') {
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password))
          fail('Password does not meet the requirements.');
        row['passwordHash'] = passwordHash(password);
      }
      if (collection === 'enquiries') {
        const year = new Date().getFullYear();
        const prefix = `ENQ-${year}-`;
        const max = Math.max(
          0,
          ...rows.map((item) =>
            string(item, 'referenceNumber').startsWith(prefix)
              ? Number(string(item, 'referenceNumber').slice(prefix.length)) || 0
              : 0,
          ),
        );
        row['referenceNumber'] = `${prefix}${String(max + 1).padStart(4, '0')}`;
      }
      validate(row, collection);
      rows.push(row);
      if (collection === 'followUps') reconcile(next, row['enquiryId']);
      persist(next);
      return send(response, 201, collection === 'adminUsers' ? publicRow(row) : row);
    }
    if (!id || index < 0) return send(response, 404, { message: 'Record not found.' });
    const old = rows[index]!;
    if (request.method === 'PATCH' || request.method === 'PUT') {
      const row: Row = {
        ...old,
        ...payload,
        id: old.id,
        createdAt: old['createdAt'],
        updatedAt: now,
      };
      if (collection === 'enquiries') row['referenceNumber'] = old['referenceNumber'];
      validate(row, collection, old);
      rows[index] = row;
      if (collection === 'followUps') reconcile(next, row['enquiryId']);
      persist(next);
      return send(response, 200, collection === 'adminUsers' ? publicRow(row) : row);
    }
    if (request.method === 'DELETE') {
      if (collection === 'adminUsers' && old.id === 'u1')
        fail('The primary demo administrator cannot be deleted.', 409);
      if (
        (collection === 'statuses' || collection === 'categories') &&
        next.enquiries.some(
          (item) => item[collection === 'statuses' ? 'statusId' : 'categoryId'] === id,
        )
      )
        fail('This record is used by enquiries. Deactivate it instead.', 409);
      rows.splice(index, 1);
      if (collection === 'enquiries')
        next.followUps = next.followUps.filter((item) => item['enquiryId'] !== id);
      if (collection === 'followUps') reconcile(next, old['enquiryId']);
      persist(next);
      return send(response, 204);
    }
    return send(response, 405, { message: 'Method not allowed.' });
  } catch (error: unknown) {
    const status =
      error instanceof Error && 'status' in error && typeof error.status === 'number'
        ? error.status
        : 500;
    send(response, status, {
      message:
        status === 500
          ? 'Unable to save data. Please try again.'
          : error instanceof Error
            ? error.message
            : 'Request failed.',
    });
  }
});
server.listen(Number(process.env['PORT'] || 3000), '127.0.0.1', () =>
  process.stdout.write(
    'Enquiry API listening on http://127.0.0.1:' + (process.env['PORT'] || '3000') + '/api\n',
  ),
);
