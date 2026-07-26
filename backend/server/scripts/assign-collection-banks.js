/**
 * List banks / PMTs on Cash (1000), or move collections onto a partner bank.
 *
 * Usage (API shell on Render):
 *   node scripts/assign-collection-banks.js --list
 *   node scripts/assign-collection-banks.js --bank=2                 # all cash PMTs → bank 2
 *   node scripts/assign-collection-banks.js --map=6:2,7:2,8:3       # installmentId:bankId
 */
/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });
else require('dotenv').config();

const PORT = process.env.PORT || 4000;
const API_URL = (process.env.API_URL || `http://127.0.0.1:${PORT}`).replace(/\/$/, '');
const EMAIL = process.env.REBUILD_EMAIL || 'admin@example.com';
const PASSWORD = process.env.REBUILD_PASSWORD || 'Admin@123';

const LIST = process.argv.includes('--list');
const bankArg = process.argv.find((a) => a.startsWith('--bank='));
const mapArg = process.argv.find((a) => a.startsWith('--map='));
const ALL_BANK = bankArg ? bankArg.split('=')[1] : null;
const MAP = {};
if (mapArg) {
  for (const part of mapArg.split('=')[1].split(',')) {
    const [inst, bank] = part.split(':').map((s) => s.trim());
    if (inst && bank) MAP[inst.replace(/^PMT-/i, '')] = bank;
  }
}

async function api(token, method, urlPath, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `${method} ${urlPath} → HTTP ${res.status}`);
  return data;
}

async function main() {
  const login = await api(null, 'POST', '/api/auth/login', {
    email: EMAIL,
    password: PASSWORD,
  });
  const token = login.access_token;
  if (!token) throw new Error('Login OK but no access_token');

  const banks = await api(token, 'GET', '/api/accounting/bank-accounts');
  console.log('\nPartner banks:');
  for (const b of banks) {
    console.log(
      `  id=${b.id}  ${[b.bank_name, b.name].filter(Boolean).join(' — ') || b.name}  coa=${b.account_id || 'none'}`,
    );
  }

  // Use rebuild report path: rebuild with apply false won't show PMTs on cash after assign.
  // Direct: get journal list and accounts
  const accounts = await api(token, 'GET', '/api/accounting/accounts');
  const cash = accounts.find((a) => a.code === '1000');
  if (!cash) throw new Error('Account 1000 not found');

  const journals = await api(token, 'GET', '/api/accounting/journal');
  const pmtRefs = journals.filter((j) => String(j.reference_no || '').startsWith('PMT-'));

  const onCash = [];
  for (const je of pmtRefs) {
    const full = await api(token, 'GET', `/api/accounting/journal/${je.id}`);
    const debit = (full.lines || []).find((l) => l.dr_cr === 'DEBIT');
    if (!debit) continue;
    if (String(debit.account_id) !== String(cash.id)) continue;
    const instId = String(je.reference_no).replace(/^PMT-/i, '').split('-')[0];
    onCash.push({
      journal_id: je.id,
      reference_no: je.reference_no,
      installment_id: instId,
      amount: debit.amount,
      date: je.entry_date,
      narration: debit.narration,
      description: je.description,
    });
  }

  console.log(`\nCollections still on Cash & Bank (1000): ${onCash.length}`);
  for (const row of onCash) {
    console.log(
      `  ${row.reference_no}  inst=${row.installment_id}  ${String(row.date).slice(0, 10)}  ${row.amount}  ${row.description || ''}`,
    );
  }

  if (LIST || (!ALL_BANK && !Object.keys(MAP).length)) {
    console.log('\nNext:');
    console.log('  node scripts/assign-collection-banks.js --bank=<id>          # move ALL cash PMTs');
    console.log('  node scripts/assign-collection-banks.js --map=6:2,7:3,8:2   # per installment');
    return;
  }

  // Re-run rebuild with default bank moves ALL unresolvable to that bank.
  // For per-map: call rebuild once per bank group by temporarily... easier: patch via rebuild default
  // then for map, rebuild with default for each subset is hard.
  // Simplest reliable approach: rebuild-vouchers with default_collection_bank_id for --bank=all case.
  // For --map: invoke accounting rebuild won't support map — use direct journal line update via
  // a dedicated API or rebuild after setting... 

  // Use rebuild endpoint with default bank when --bank= is set (all remaining).
  if (ALL_BANK && !Object.keys(MAP).length) {
    const report = await api(token, 'POST', '/api/accounting/journal/rebuild-vouchers', {
      apply: true,
      default_collection_bank_id: ALL_BANK,
    });
    console.log('\nRebuild with default bank:');
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Per-installment map: rebuild once per target bank is wrong (would overwrite).
  // Call new lightweight endpoint... if missing, update lines via fetch after rebuild each.
  // Implement assign by posting rebuild is insufficient.
  // Fall back: for each mapping, delete PMT and we need post — use rebuild with default
  // only works for all.

  // Persist bank on sale_installments (collection table) and rebuild PMT journal
  const bankById = new Map(banks.map((b) => [String(b.id), b]));
  let moved = 0;
  for (const row of onCash) {
    const bankId = MAP[row.installment_id] || ALL_BANK;
    if (!bankId) continue;
    const bank = bankById.get(String(bankId));
    if (!bank) {
      console.error(`Unknown bank #${bankId} — skip ${row.reference_no}`);
      continue;
    }
    await api(token, 'PATCH', `/api/sales/installments/${row.installment_id}/bank`, {
      bank_account_id: bank.id,
    });
    console.log(
      `Saved collection bank + rebuilt ${row.reference_no} → bank #${bank.id} (${bank.bank_name || bank.name})`,
    );
    moved += 1;
  }
  console.log(`\nDone. Updated ${moved} collection(s) from installment table.`);
}

main().catch((err) => {
  console.error('FAILED:', err.message || err);
  process.exit(1);
});
