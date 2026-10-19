import pg, { type PoolClient, type QueryResultRow } from 'pg';

const { Pool } = pg;

let pool: pg.Pool | undefined;

export function database(): pg.Pool {
  const connectionString = process.env['DATABASE_URL'] || process.env['POSTGRES_URL'];
  if (!connectionString) throw new Error('DATABASE_URL is required.');
  pool ??= new Pool({
    connectionString,
    max: Number(process.env['DATABASE_POOL_SIZE'] || 5),
    ssl: process.env['DATABASE_SSL'] === 'false' ? false : { rejectUnauthorized: false },
  });
  return pool;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return database().query<T>(text, values);
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await database().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) await pool.end();
  pool = undefined;
}
