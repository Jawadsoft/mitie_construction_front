import { getAuthHeaders } from './client';

export interface Expense {
  id: string;
  project_id: string;
  project_stage_id: string;
  category: string;
  vendor_type: string;
  supplier_id: string | null;
  contractor_id: string | null;
  payment_type: string;
  expense_date: string;
  amount: string;
  description: string | null;
  created_at: string;
}

const BASE = '/api/expenses';

export async function getExpenses(filters?: { project_id?: string; project_stage_id?: string }): Promise<Expense[]> {
  const params = new URLSearchParams();
  if (filters?.project_id) params.append('project_id', filters.project_id);
  if (filters?.project_stage_id) params.append('project_stage_id', filters.project_stage_id);
  const res = await fetch(`${BASE}?${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch expenses');
  return res.json();
}

export async function createExpense(dto: Partial<Expense>): Promise<Expense> {
  const res = await fetch(BASE, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create expense');
  return data;
}

export async function updateExpense(id: string, dto: Partial<Expense>): Promise<Expense> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update expense');
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete expense');
}

export async function getExpenseSummary(project_id?: string) {
  const params = project_id ? `?project_id=${project_id}` : '';
  const res = await fetch(`${BASE}/summary${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json() as Promise<{ category: string; total: string }[]>;
}
