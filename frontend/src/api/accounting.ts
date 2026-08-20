import { getAuthHeaders, readApiError, API_BASE } from './client';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  is_active: boolean;
  parent_account_id?: string | null;
}

export interface JournalEntryLine {
  id?: string;
  account_id: string;
  dr_cr: 'DEBIT' | 'CREDIT';
  amount: string;
  narration: string | null;
  account?: Account;
}

export interface JournalEntry {
  id: string;
  entry_date: string;
  reference_no: string | null;
  description: string | null;
  status: string;
  project_id: string | null;
  lines?: JournalEntryLine[];
  /** Present on list endpoint */
  total_debit?: string | number;
  total_credit?: string | number;
  created_at: string;
}

export interface TrialBalanceRow {
  account_id: string;
  code: string;
  name: string;
  type: string;
  total_debit: string;
  total_credit: string;
}

export interface GeneralLedgerRow {
  entry_date: string;
  reference_no: string | null;
  voucher_no: string;
  particular: string;
  description: string | null;
  narration: string | null;
  journal_entry_id: string | null;
  project_id: string | null;
  project_name: string | null;
  account_id: string;
  account_code: string;
  account_name: string;
  debit: string;
  credit: string;
  running_balance: number;
  balance_side: 'Dr' | 'Cr' | '';
  is_opening?: boolean;
}

export interface GeneralLedgerReport {
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
    is_head: boolean;
  };
  include_children: boolean;
  period: { from: string | null; to: string | null };
  opening_balance: number;
  opening_balance_side: 'Dr' | 'Cr' | '';
  rows: GeneralLedgerRow[];
  totals: {
    debit: number;
    credit: number;
    closing_balance: number;
    closing_balance_side: 'Dr' | 'Cr' | '';
  };
}

export interface BalanceSheetReport {
  as_of: string | null;
  assets: { code: string; name: string; balance: number }[];
  liabilities: { code: string; name: string; balance: number }[];
  equity: { code: string; name: string; balance: number }[];
  net_income: number;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  balanced: boolean;
}

export interface BankAccount {
  id: string;
  account_id: string | null;
  name: string;
  bank_name: string | null;
  account_number: string | null;
  currency: string;
  opening_balance: string;
  is_active: boolean;
  account_code?: string | null;
  account_name?: string | null;
}

export interface BankStatementLine {
  id: string;
  bank_account_id: string;
  statement_date: string;
  value_date: string | null;
  description: string | null;
  amount: string;
  reference: string | null;
  reconciled: boolean;
  cash_transaction_id: string | null;
  journal_entry_id: string | null;
}

export interface BankReconciliation {
  id: string;
  bank_account_id: string;
  period_start: string;
  period_end: string;
  statement_ending_balance: string | null;
  book_ending_balance: string | null;
  status: string;
  notes: string | null;
}

const BASE = `${API_BASE}/api/accounting`;

export async function getAccounts(): Promise<Account[]> {
  const res = await fetch(`${BASE}/accounts`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch accounts');
  return res.json();
}

export async function createAccount(dto: Partial<Account>): Promise<Account> {
  const res = await fetch(`${BASE}/accounts`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error(await readApiError(res, 'Failed to create account'));
  return res.json();
}

export async function updateAccount(id: string, dto: Partial<Account>): Promise<Account> {
  const res = await fetch(`${BASE}/accounts/${id}`, {
    method: 'PATCH', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error(await readApiError(res, 'Failed to update account'));
  return res.json();
}

export async function getJournalEntries(project_id?: string): Promise<JournalEntry[]> {
  const params = project_id ? `?project_id=${project_id}` : '';
  const res = await fetch(`${BASE}/journal${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch journal entries');
  return res.json();
}

export async function getJournalEntry(id: string): Promise<JournalEntry> {
  const res = await fetch(`${BASE}/journal/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch journal entry');
  return res.json();
}

export async function createJournalEntry(dto: { entry: Partial<JournalEntry>; lines: JournalEntryLine[] }): Promise<JournalEntry> {
  const res = await fetch(`${BASE}/journal`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create journal entry');
  return data;
}

/** Move money between Cash on hand and/or bank accounts (null bank id = cash till). */
export async function createCashBankTransfer(dto: {
  transfer_date: string;
  amount: string | number;
  from_bank_account_id?: string | null;
  to_bank_account_id?: string | null;
  reference_no?: string | null;
  description?: string | null;
  project_id?: string | null;
}): Promise<JournalEntry> {
  const res = await fetch(`${BASE}/transfers`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create transfer');
  return data;
}

export async function postJournalEntry(id: string): Promise<JournalEntry> {
  const res = await fetch(`${BASE}/journal/${id}/post`, { method: 'POST', headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to post journal entry');
  return data;
}

export async function updateJournalEntry(
  id: string,
  dto: { entry: Partial<JournalEntry>; lines: JournalEntryLine[] },
): Promise<JournalEntry> {
  const headers = getAuthHeaders();
  if (!headers.Authorization) {
    throw new Error('Session expired or not logged in. Please log out and log in again, then retry.');
  }
  const res = await fetch(`${BASE}/journal/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error(await readApiError(res, 'Failed to update journal entry'));
  return res.json();
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const headers = getAuthHeaders();
  if (!headers.Authorization) {
    throw new Error('Session expired or not logged in. Please log out and log in again, then retry.');
  }
  const res = await fetch(`${BASE}/journal/${id}`, { method: 'DELETE', headers });
  if (!res.ok) {
    throw new Error(await readApiError(res, 'Failed to delete journal entry'));
  }
}

export async function purgeOrphanJournals(): Promise<{ deleted: number; references: string[] }> {
  const res = await fetch(`${BASE}/journal/purge-orphans`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to purge orphan journals');
  return data;
}

export async function getTrialBalance(from?: string, to?: string): Promise<TrialBalanceRow[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString() ? `?${params}` : '';
  const res = await fetch(`${BASE}/reports/trial-balance${qs}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch trial balance');
  return res.json();
}

export async function getGeneralLedger(
  account_id: string,
  from?: string,
  to?: string,
  include_children?: boolean,
): Promise<GeneralLedgerReport> {
  const params = new URLSearchParams({ account_id });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (include_children !== undefined) params.set('include_children', String(include_children));
  const res = await fetch(`${BASE}/reports/general-ledger?${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch general ledger');
  return res.json();
}

export async function getBalanceSheet(as_of?: string): Promise<BalanceSheetReport> {
  const qs = as_of ? `?as_of=${as_of}` : '';
  const res = await fetch(`${BASE}/reports/balance-sheet${qs}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch balance sheet');
  return res.json();
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  const res = await fetch(`${BASE}/bank-accounts`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch bank accounts');
  return res.json();
}

export async function createBankAccount(dto: Partial<BankAccount>): Promise<BankAccount> {
  const res = await fetch(`${BASE}/bank-accounts`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to create bank account');
  return res.json();
}

export async function updateBankAccount(
  id: string,
  dto: Partial<BankAccount> & { opening_date?: string; clear_opening?: boolean },
): Promise<BankAccount> {
  const res = await fetch(`${BASE}/bank-accounts/${id}`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to update bank account');
  return data;
}

export async function getStatementLines(bank_account_id: string): Promise<BankStatementLine[]> {
  const res = await fetch(`${BASE}/bank-accounts/${bank_account_id}/statements`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch statement lines');
  return res.json();
}

export async function createStatementLines(
  bank_account_id: string,
  lines: Partial<BankStatementLine>[],
): Promise<BankStatementLine[]> {
  const res = await fetch(`${BASE}/bank-accounts/${bank_account_id}/statements`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines }),
  });
  if (!res.ok) throw new Error('Failed to add statement lines');
  return res.json();
}

export async function matchStatementLine(
  id: string,
  dto: { cash_transaction_id?: string | null; journal_entry_id?: string | null; reconciled?: boolean },
): Promise<BankStatementLine> {
  const res = await fetch(`${BASE}/statement-lines/${id}/match`, {
    method: 'PATCH', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to match statement line');
  return res.json();
}

export async function getReconciliations(bank_account_id?: string): Promise<BankReconciliation[]> {
  const qs = bank_account_id ? `?bank_account_id=${bank_account_id}` : '';
  const res = await fetch(`${BASE}/reconciliations${qs}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch reconciliations');
  return res.json();
}

export async function createReconciliation(dto: Partial<BankReconciliation>): Promise<BankReconciliation> {
  const res = await fetch(`${BASE}/reconciliations`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to create reconciliation');
  return res.json();
}

export async function completeReconciliation(id: string): Promise<BankReconciliation> {
  const res = await fetch(`${BASE}/reconciliations/${id}/complete`, {
    method: 'POST', headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to complete reconciliation');
  return res.json();
}
