import { getAuthHeaders } from './client';

export interface CashTransaction {
  id: string;
  transaction_date: string;
  type: 'IN' | 'OUT';
  amount: string;
  method: string;
  reference_no: string | null;
  description: string | null;
  project_id: string | null;
  created_at: string;
}

export interface DashboardStats {
  cash_balance: number; cash_in: number; cash_out: number;
  active_projects: number; total_budget: number; total_expenses: number;
  total_labour: number; total_cost: number; total_revenue: number;
  collected_revenue: number; pending_receivables: number; supplier_payables: number;
  total_units: number; sold_units: number; avg_stage_completion: number; expected_profit: number;
}

const BASE = '/api/cashflow';

export async function getCashTransactions(filters?: { project_id?: string; type?: string }): Promise<CashTransaction[]> {
  const params = new URLSearchParams();
  if (filters?.project_id) params.append('project_id', filters.project_id);
  if (filters?.type) params.append('type', filters.type);
  const res = await fetch(`${BASE}?${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch cash transactions');
  return res.json();
}

export async function createCashTransaction(dto: Partial<CashTransaction>): Promise<CashTransaction> {
  const res = await fetch(BASE, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to create transaction');
  return res.json();
}

export async function updateCashTransaction(id: string, dto: Partial<CashTransaction>): Promise<CashTransaction> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to update transaction');
  return res.json();
}

export async function deleteCashTransaction(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete transaction');
}

export async function getCashflowSummary() {
  const res = await fetch(`${BASE}/summary`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json() as Promise<{ in: number; out: number; balance: number }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${BASE}/dashboard`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}
