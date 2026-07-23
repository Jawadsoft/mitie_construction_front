import { getAuthHeaders } from './client';

export interface Expense {
  id: string;
  project_id: string;
  project_stage_id: string;
  category: string;
  vendor_type: string;
  supplier_id: string | null;
  contractor_id: string | null;
  entry_mode: 'DIRECT' | 'BILL' | string;
  payment_type: string;
  bank_account_id: string | null;
  expense_date: string;
  amount: string;
  paid_amount: string;
  status: string;
  description: string | null;
  created_at: string;
}

export interface ExpensePayment {
  id: string;
  expense_id: string;
  paid_date: string;
  amount: string;
  payment_method: string;
  bank_account_id: string | null;
  notes: string | null;
  created_at: string;
}

const BASE = '/api/expenses';

export async function getExpenses(filters?: {
  project_id?: string;
  project_stage_id?: string;
  status?: string;
  entry_mode?: string;
}): Promise<Expense[]> {
  const params = new URLSearchParams();
  if (filters?.project_id) params.append('project_id', filters.project_id);
  if (filters?.project_stage_id) params.append('project_stage_id', filters.project_stage_id);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.entry_mode) params.append('entry_mode', filters.entry_mode);
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

export async function payExpenseBill(
  id: string,
  dto: {
    amount: string;
    paid_date: string;
    payment_method?: string;
    bank_account_id?: string;
    notes?: string;
  },
): Promise<{ expense: Expense; payment: ExpensePayment }> {
  const res = await fetch(`${BASE}/${id}/pay`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to record bill payment');
  return data;
}

export async function getExpensePayments(id: string): Promise<ExpensePayment[]> {
  const res = await fetch(`${BASE}/${id}/payments`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch expense payments');
  return res.json();
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
