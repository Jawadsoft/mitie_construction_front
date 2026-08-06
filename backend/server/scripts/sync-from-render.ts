import 'dotenv/config';
import { Client } from 'pg';

type ColumnMeta = { column_name: string; data_type: string; udt_name: string };

function renderClient() {
  const url = process.env.RENDER_DATABASE_URL;
  if (url) {
    return new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  }
  return new Client({
    host: process.env.RENDER_DB_HOST,
    port: Number(process.env.RENDER_DB_PORT || 5432),
    user: process.env.RENDER_DB_USER,
    password: process.env.RENDER_DB_PASSWORD,
    database: process.env.RENDER_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
}

function localClient() {
  const url = process.env.LOCAL_DATABASE_URL;
  if (url) {
    return new Client({ connectionString: url });
  }
  return new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'dealeriq',
    database: process.env.DB_NAME || 'construction_erp',
  });
}

function placeholderFor(meta: ColumnMeta, index: number): string {
  if (meta.data_type === 'json' || meta.data_type === 'jsonb' || meta.udt_name === 'json' || meta.udt_name === 'jsonb') {
    return `$${index}::jsonb`;
  }
  return `$${index}`;
}

function serializeValue(meta: ColumnMeta, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (meta.data_type === 'json' || meta.data_type === 'jsonb' || meta.udt_name === 'json' || meta.udt_name === 'jsonb') {
    return String(value);
  }
  return value;
}

async function getTables(client: Client): Promise<string[]> {
  const { rows } = await client.query<{ tablename: string }>(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
    ORDER BY tablename
  `);
  return rows.map((r) => r.tablename);
}

async function getColumns(client: Client, table: string): Promise<ColumnMeta[]> {
  const { rows } = await client.query<ColumnMeta>(
    `
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `,
    [table],
  );
  return rows;
}

async function copyTable(source: Client, dest: Client, table: string) {
  const columns = await getColumns(source, table);
  if (columns.length === 0) return;

  const colNames = columns.map((c) => c.column_name);
  const selectList = colNames
    .map((name, i) => {
      const meta = columns[i];
      if (meta.data_type === 'json' || meta.data_type === 'jsonb' || meta.udt_name === 'json' || meta.udt_name === 'jsonb') {
        return `"${name}"::text AS "${name}"`;
      }
      return `"${name}"`;
    })
    .join(', ');

  const { rows } = await source.query(`SELECT ${selectList} FROM "${table}"`);
  if (rows.length === 0) {
    console.log(`  ${table}: 0 rows (skipped)`);
    return;
  }

  const colList = colNames.map((c) => `"${c}"`).join(', ');
  const placeholders = colNames
    .map((_, i) => placeholderFor(columns[i], i + 1))
    .join(', ');

  for (const row of rows) {
    const values = colNames.map((name, i) =>
      serializeValue(columns[i], row[name]),
    );
    await dest.query(
      `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`,
      values,
    );
  }

  console.log(`  ${table}: ${rows.length} rows copied`);
}

async function sync() {
  const source = renderClient();
  const dest = localClient();

  console.log('Connecting to Render database...');
  await source.connect();
  console.log('Connecting to local database...');
  await dest.connect();

  const tables = await getTables(source);
  if (tables.length === 0) {
    console.log('No tables found on Render.');
    return;
  }

  console.log(`Found ${tables.length} tables. Clearing local data...`);
  await dest.query('SET session_replication_role = replica');
  for (const table of [...tables].reverse()) {
    await dest.query(`TRUNCATE TABLE "${table}" CASCADE`);
  }

  console.log('Copying data from Render → local...');
  for (const table of tables) {
    try {
      await copyTable(source, dest, table);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`${table}: ${message}`);
    }
  }

  await dest.query('SET session_replication_role = DEFAULT');
  console.log('Done. Local database now mirrors Render data.');
}

sync()
  .catch((err) => {
    console.error('Sync failed:', err.message || err);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
