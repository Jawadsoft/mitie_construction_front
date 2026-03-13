import { getAuthHeaders } from './client';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  is_active: boolean;
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

const BASE = '/api/accounting';

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
  if (!res.ok) throw new Error('Failed to create account');
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

export async function getTrialBalance(): Promise<TrialBalanceRow[]> {
  const res = await fetch(`${BASE}/reports/trial-balance`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch trial balance');
  return res.json();
}
