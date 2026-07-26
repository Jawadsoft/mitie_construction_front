/**
 * Rebuild voucher journals via the running Nest API (works on Render).
 *
 * Usage:
 *   node scripts/rebuild-voucher-journals.js              # dry-run
 *   node scripts/rebuild-voucher-journals.js --apply
 *   node scripts/rebuild-voucher-journals.js --apply --bank=2
 *
 * Env:
 *   PORT / API_URL / REBUILD_EMAIL / REBUILD_PASSWORD
 *   defaults: http://127.0.0.1:$PORT  admin@example.com / Admin@123
 */
/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const APPLY = process.argv.includes('--apply');
const bankArg = process.argv.find((a) => a.startsWith('--bank='));
const DEFAULT_BANK = bankArg ? bankArg.split('=')[1] : null;

const PORT = process.env.PORT || 4000;
const API_URL = (process.env.API_URL || `http://127.0.0.1:${PORT}`).replace(/\/$/, '');
const EMAIL = process.env.REBUILD_EMAIL || 'admin@example.com';
const PASSWORD = process.env.REBUILD_PASSWORD || 'Admin@123';

async function main() {
  console.log(APPLY ? 'MODE: APPLY' : 'MODE: DRY-RUN (pass --apply to write)');
  console.log(`API: ${API_URL}`);

  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const loginData = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) {
    throw new Error(loginData.message || `Login failed (HTTP ${loginRes.status})`);
  }
  const token = loginData.access_token;
  if (!token) throw new Error('Login OK but no access_token returned');

  const body = {
    apply: APPLY,
    default_collection_bank_id: DEFAULT_BANK,
  };
  const res = await fetch(`${API_URL}/api/accounting/journal/rebuild-vouchers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const report = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(report.message || `Rebuild failed (HTTP ${res.status})`);
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.errors?.length) process.exitCode = 2;
  if (report.payments_left_on_cash?.length) {
    console.log(
      '\nCollections still on Cash (1000) — re-run with --bank=<bank_id> if you want a default partner bank:',
    );
    console.log(report.payments_left_on_cash.join(', '));
  }
}

main().catch((err) => {
  console.error('FAILED:', err.message || err);
  process.exit(1);
});
