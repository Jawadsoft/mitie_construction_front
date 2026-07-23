import { getAuthHeaders } from './client';

export interface FundSource {
  id: string;
  project_id: string | null;
  bank_account_id: string | null;
  source_name: string;
  source_type: string;
  total_committed: string;
  received_so_far: string;
  status: string;
  expected_date: string | null;
  notes: string | null;
  created_at: string;
  /** Joined from bank_accounts when listing */
  bank_account_name?: string | null;
  bank_name?: string | null;
}

export interface FundTransaction {
  id: string;
  fund_source_id: string;
  transaction_date: string;
  amount: string;
  reference_no: string | null;
  notes: string | null;
  fund_source?: FundSource;
  created_at: string;
}

const BASE = '/api/funds';

export async function getFundSources(filters?: {
  project_id?: string;
  bank_account_id?: string;
  status?: string;
}): Promise<FundSource[]> {
  const params = new URLSearchParams();
  if (filters?.project_id) params.append('project_id', filters.project_id);
  if (filters?.bank_account_id) params.append('bank_account_id', filters.bank_account_id);
  if (filters?.status) params.append('status', filters.status);
  const q = params.toString() ? `?${params}` : '';
  const res = await fetch(`${BASE}/sources${q}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch fund sources');
  return res.json();
}

export async function createFundSource(dto: Partial<FundSource>): Promise<FundSource> {
  const res = await fetch(`${BASE}/sources`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Failed to create fund source');
  }
  return res.json();
}

export async function getFundTransactions(fund_source_id?: string): Promise<FundTransaction[]> {
  const params = fund_source_id ? `?fund_source_id=${fund_source_id}` : '';
  const res = await fetch(`${BASE}/transactions${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function createFundTransaction(dto: Partial<FundTransaction>): Promise<FundTransaction> {
  const res = await fetch(`${BASE}/transactions`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to create transaction');
  return res.json();
}

export async function updateFundSource(id: string, dto: Partial<FundSource>): Promise<FundSource> {
  const res = await fetch(`${BASE}/sources/${id}`, {
    method: 'PATCH', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to update fund source');
  return res.json();
}

export async function deleteFundSource(id: string): Promise<void> {
  const res = await fetch(`${BASE}/sources/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete fund source');
}

export async function updateFundTransaction(id: string, dto: Partial<FundTransaction>): Promise<FundTransaction> {
  const res = await fetch(`${BASE}/transactions/${id}`, {
    method: 'PATCH', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to update transaction');
  return res.json();
}

export async function deleteFundTransaction(id: string): Promise<void> {
  const res = await fetch(`${BASE}/transactions/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete fund transaction');
}
