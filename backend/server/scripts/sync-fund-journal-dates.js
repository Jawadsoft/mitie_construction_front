/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });
else require('dotenv').config();

function dbConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DB_SSL === 'true' || /render\.com|sslmode=require/i.test(process.env.DATABASE_URL)
          ? { rejectUnauthorized: false }
          : undefined,
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'construction_erp',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

async function main() {
  const client = new Client(dbConfig());
  await client.connect();
  try {
    const before = await client.query(`
      SELECT je.reference_no,
             je.entry_date::text AS journal_date,
             ft.transaction_date::text AS receipt_date
      FROM journal_entries je
      JOIN fund_transactions ft ON je.reference_no = ('FUND-' || ft.id::text)
      ORDER BY ft.id
    `);
    console.log('Before:');
    console.table(before.rows);

    const r = await client.query(`
      UPDATE journal_entries je
      SET entry_date = ft.transaction_date
      FROM fund_transactions ft
      WHERE je.reference_no = ('FUND-' || ft.id::text)
        AND je.entry_date IS DISTINCT FROM ft.transaction_date
    `);
    console.log(`Updated ${r.rowCount} journal(s).`);

    const after = await client.query(`
      SELECT je.reference_no,
             je.entry_date::text AS journal_date,
             ft.transaction_date::text AS receipt_date
      FROM journal_entries je
      JOIN fund_transactions ft ON je.reference_no = ('FUND-' || ft.id::text)
      ORDER BY ft.id
    `);
    console.log('After:');
    console.table(after.rows);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
