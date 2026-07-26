/**
 * Move journal lines that were posted to parent Cash & Bank (code 1000)
 * onto the correct partner sub-accounts (Jawad, Faysal, etc.).
 *
 * Usage (from backend/server):
 *   node scripts/fix-parent-cash-bank-entries.js            # dry-run
 *   node scripts/fix-parent-cash-bank-entries.js --apply    # write changes
 *
 * Optional:
 *   --orphan-pmts-to=<bank_id>   Move unmatched PMT-* "Cash received" lines
 *                                on parent 1000 to this bank's sub-account
 *
 * Env: DATABASE_URL or DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME / DB_SSL
 */

/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

// Load .env from server folder if present
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const APPLY = process.argv.includes('--apply');
const orphanArg = process.argv.find((a) => a.startsWith('--orphan-pmts-to='));
const ORPHAN_PMTS_TO = orphanArg ? orphanArg.split('=')[1] : null;

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

function bankDisplayName(bank) {
  const name = (bank.name || '').trim();
  const bn = (bank.bank_name || '').trim();
  if (bn && name && bn.toLowerCase() !== name.toLowerCase()) return `${bn} — ${name}`;
  return name || bn || 'Bank Account';
}

async function nextChildCode(client) {
  const { rows } = await client.query(
    `SELECT code FROM accounts
     WHERE code LIKE '10%' AND LENGTH(code) = 4 AND code <> '1000'`,
  );
  const used = new Set(rows.map((r) => r.code));
  for (let n = 1001; n <= 1099; n += 1) {
    const code = String(n);
    if (!used.has(code)) return code;
  }
  throw new Error('No free Cash & Bank sub-account codes (1001–1099)');
}

async function ensureBankSubAccounts(client, cash) {
  const { rows: banks } = await client.query(
    `SELECT id, name, bank_name, account_id FROM bank_accounts ORDER BY id`,
  );
  const created = [];
  for (const bank of banks) {
    if (bank.account_id && String(bank.account_id) !== String(cash.id)) {
      // Keep parent link tidy
      await client.query(
        `UPDATE accounts SET parent_account_id = $1
         WHERE id = $2 AND (parent_account_id IS NULL OR parent_account_id <> $1)`,
        [cash.id, bank.account_id],
      );
      continue;
    }
    const code = await nextChildCode(client);
    const name = bankDisplayName(bank);
    if (!APPLY) {
      console.log(`[dry-run] would create COA ${code} "${name}" for bank #${bank.id}`);
      created.push({ bankId: bank.id, code, name, accountId: null });
      continue;
    }
    const ins = await client.query(
      `INSERT INTO accounts (code, name, type, is_active, parent_account_id)
       VALUES ($1, $2, 'ASSET', true, $3)
       RETURNING id, code, name`,
      [code, name, cash.id],
    );
    const sub = ins.rows[0];
    await client.query(`UPDATE bank_accounts SET account_id = $1 WHERE id = $2`, [
      sub.id,
      bank.id,
    ]);
    console.log(`Created COA ${sub.code} "${sub.name}" → bank #${bank.id}`);
    created.push({ bankId: bank.id, code: sub.code, name: sub.name, accountId: sub.id });
  }
  return { banks, created };
}

function resolveBankFromNarration(narration, banks) {
  if (!narration) return null;
  const m = String(narration).match(/^Bank:\s*(.+)$/i);
  const needle = (m ? m[1] : narration).trim().toLowerCase();
  if (!needle) return null;
  return (
    banks.find((b) => {
      const candidates = [
        b.bank_name,
        b.name,
        bankDisplayName(b),
        `${b.bank_name || ''} — ${b.name || ''}`.trim(),
      ]
        .filter(Boolean)
        .map((s) => s.trim().toLowerCase());
      return candidates.some((c) => c === needle || needle.includes(c) || c.includes(needle));
    }) || null
  );
}

async function main() {
  const client = new Client(dbConfig());
  await client.connect();
  console.log(APPLY ? 'MODE: APPLY (writes enabled)' : 'MODE: DRY-RUN (no writes)');
  console.log('');

  try {
    const cashRes = await client.query(
      `SELECT id, code, name FROM accounts WHERE code = '1000' LIMIT 1`,
    );
    if (!cashRes.rows.length) {
      throw new Error('Account code 1000 (Cash & Bank) not found');
    }
    const cash = cashRes.rows[0];
    console.log(`Parent Cash & Bank: #${cash.id} ${cash.code} ${cash.name}`);

    if (APPLY) await client.query('BEGIN');

    await ensureBankSubAccounts(client, cash);

    const { rows: banks } = await client.query(
      `SELECT id, name, bank_name, account_id FROM bank_accounts ORDER BY id`,
    );
    const bankById = new Map(banks.map((b) => [String(b.id), b]));
    console.log('\nPartner banks:');
    for (const b of banks) {
      const linked = b.account_id
        ? (
            await client.query(`SELECT code, name FROM accounts WHERE id = $1`, [b.account_id])
          ).rows[0]
        : null;
      console.log(
        `  #${b.id} ${bankDisplayName(b)} → ${
          linked ? `${linked.code} ${linked.name}` : '(no sub-account yet — re-run with --apply)'
        }`,
      );
    }

    // Candidate lines on parent 1000
    const { rows: parentLines } = await client.query(
      `
      SELECT
        l.id AS line_id,
        l.dr_cr,
        l.amount,
        l.narration,
        je.id AS journal_id,
        je.reference_no,
        je.description,
        je.entry_date::text AS entry_date
      FROM journal_entry_lines l
      INNER JOIN journal_entries je ON je.id = l.journal_entry_id
      WHERE l.account_id = $1
      ORDER BY je.entry_date, l.id
      `,
      [cash.id],
    );

    console.log(`\nJournal lines currently on parent 1000: ${parentLines.length}`);

    const moves = [];
    const skipped = [];

    for (const line of parentLines) {
      const ref = line.reference_no || '';
      let targetBank = null;
      let reason = '';

      // EXP-{expenseId}
      let m = ref.match(/^EXP-(\d+)$/i);
      if (m) {
        const { rows } = await client.query(
          `SELECT bank_account_id FROM expenses WHERE id = $1`,
          [m[1]],
        );
        if (rows[0]?.bank_account_id) {
          targetBank = bankById.get(String(rows[0].bank_account_id));
          reason = `expense #${m[1]} bank_account_id`;
        }
      }

      // EXPPMT-{paymentId}
      if (!targetBank) {
        m = ref.match(/^EXPPMT-(\d+)$/i);
        if (m) {
          const { rows } = await client.query(
            `SELECT bank_account_id FROM expense_payments WHERE id = $1`,
            [m[1]],
          );
          if (rows[0]?.bank_account_id) {
            targetBank = bankById.get(String(rows[0].bank_account_id));
            reason = `expense_payment #${m[1]} bank_account_id`;
          }
        }
      }

      // FUND-{txId}
      if (!targetBank) {
        m = ref.match(/^FUND-(\d+)$/i);
        if (m) {
          const { rows } = await client.query(
            `
            SELECT fs.bank_account_id
            FROM fund_transactions ft
            INNER JOIN fund_sources fs ON fs.id = ft.fund_source_id
            WHERE ft.id = $1
            `,
            [m[1]],
          );
          if (rows[0]?.bank_account_id) {
            targetBank = bankById.get(String(rows[0].bank_account_id));
            reason = `fund_transaction #${m[1]} → source bank`;
          }
        }
      }

      // Narration "Bank: …"
      if (!targetBank) {
        const byNarr = resolveBankFromNarration(line.narration, banks);
        if (byNarr) {
          targetBank = byNarr;
          reason = `narration "${line.narration}"`;
        }
      }

      // Optional orphan PMT move
      if (!targetBank && ORPHAN_PMTS_TO && /^PMT-/i.test(ref)) {
        targetBank = bankById.get(String(ORPHAN_PMTS_TO));
        reason = `orphan PMT → --orphan-pmts-to=${ORPHAN_PMTS_TO}`;
      }

      if (!targetBank) {
        skipped.push(line);
        continue;
      }

      const subId = targetBank.account_id;
      if (!subId || String(subId) === String(cash.id)) {
        skipped.push({ ...line, skip_reason: `bank #${targetBank.id} has no sub-account` });
        continue;
      }

      moves.push({
        line_id: line.line_id,
        from: cash.id,
        to: subId,
        bank_id: targetBank.id,
        bank_label: bankDisplayName(targetBank),
        ref,
        amount: line.amount,
        dr_cr: line.dr_cr,
        date: line.entry_date,
        reason,
      });
    }

    console.log(`\nWill reassign: ${moves.length}`);
    for (const mv of moves) {
      console.log(
        `  line #${mv.line_id} ${mv.date} ${mv.ref} ${mv.dr_cr} ${mv.amount} → bank #${mv.bank_id} (${mv.bank_label}) [${mv.reason}]`,
      );
    }

    console.log(`\nLeft on parent 1000 (no bank resolved): ${skipped.length}`);
    for (const s of skipped.slice(0, 50)) {
      console.log(
        `  line #${s.line_id} ${s.entry_date} ${s.reference_no} ${s.dr_cr} ${s.amount} narr="${s.narration || ''}"${
          s.skip_reason ? ` (${s.skip_reason})` : ''
        }`,
      );
    }
    if (skipped.length > 50) console.log(`  …and ${skipped.length - 50} more`);

    if (APPLY && moves.length) {
      for (const mv of moves) {
        await client.query(`UPDATE journal_entry_lines SET account_id = $1 WHERE id = $2`, [
          mv.to,
          mv.line_id,
        ]);
      }
      console.log(`\nUpdated ${moves.length} journal line(s).`);
    } else if (!APPLY) {
      console.log('\nDry-run only. Re-run with --apply to write changes.');
    } else {
      console.log('\nNothing to update.');
    }

    if (APPLY) await client.query('COMMIT');

    // Post-fix summary of parent balance
    const bal = await client.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN l.dr_cr = 'DEBIT' THEN l.amount ELSE 0 END), 0) AS debits,
        COALESCE(SUM(CASE WHEN l.dr_cr = 'CREDIT' THEN l.amount ELSE 0 END), 0) AS credits
      FROM journal_entry_lines l
      INNER JOIN journal_entries je ON je.id = l.journal_entry_id AND je.status = 'Posted'
      WHERE l.account_id = $1
      `,
      [cash.id],
    );
    console.log(
      `\nPosted activity still on parent 1000 after ${APPLY ? 'apply' : 'dry-run'}: Dr ${bal.rows[0].debits} / Cr ${bal.rows[0].credits}`,
    );
  } catch (err) {
    if (APPLY) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
    }
    console.error('\nFAILED:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
