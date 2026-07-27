import { getAuthHeaders, API_BASE } from './client';

export interface LabourContractor {
  id: string;
  name: string;
  contractor_type: string | null;
  phone: string | null;
  email: string | null;
  daily_rate: string | null;
  is_active: boolean;
}

export interface LabourAttendance {
  id: string;
  contractor_id: string;
  project_id: string;
  project_stage_id: string | null;
  attendance_date: string;
  present_days: string;
  notes: string | null;
  contractor?: LabourContractor;
}

export interface LabourPayment {
  id: string;
  contractor_id: string;
  project_id: string;
  project_stage_id?: string | null;
  bank_account_id?: string | null;
  payment_date: string;
  amount: string;
  payment_method: string;
  reference_no: string | null;
  notes: string | null;
  contractor?: LabourContractor;
}

const BASE = `${API_BASE}/api/labour`;

export const getContractors = async (): Promise<LabourContractor[]> => {
  const res = await fetch(`${BASE}/contractors`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch contractors');
  return res.json();
};

export const createContractor = async (dto: Partial<LabourContractor>): Promise<LabourContractor> => {
  const res = await fetch(`${BASE}/contractors`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to create contractor');
  return res.json();
};

export const getAttendance = async (project_id?: string): Promise<LabourAttendance[]> => {
  const params = project_id ? `?project_id=${project_id}` : '';
  const res = await fetch(`${BASE}/attendance${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch attendance');
  return res.json();
};

export const createAttendance = async (dto: Partial<LabourAttendance>): Promise<LabourAttendance> => {
  const res = await fetch(`${BASE}/attendance`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to create attendance');
  return res.json();
};

export const getPayments = async (project_id?: string): Promise<LabourPayment[]> => {
  const params = project_id ? `?project_id=${project_id}` : '';
  const res = await fetch(`${BASE}/payments${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch payments');
  return res.json();
};

export const createPayment = async (dto: Partial<LabourPayment>): Promise<LabourPayment> => {
  const res = await fetch(`${BASE}/payments`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to create payment');
  return res.json();
};

export const updateContractor = async (id: string, dto: Partial<LabourContractor>): Promise<LabourContractor> => {
  const res = await fetch(`${BASE}/contractors/${id}`, {
    method: 'PATCH', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to update contractor');
  return res.json();
};

export const deleteContractor = async (id: string): Promise<void> => {
  const res = await fetch(`${BASE}/contractors/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete contractor');
};

export const updateAttendance = async (id: string, dto: Partial<LabourAttendance>): Promise<LabourAttendance> => {
  const res = await fetch(`${BASE}/attendance/${id}`, {
    method: 'PATCH', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to update attendance');
  return res.json();
};

export const deleteAttendance = async (id: string): Promise<void> => {
  const res = await fetch(`${BASE}/attendance/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete attendance');
};

export const updatePayment = async (id: string, dto: Partial<LabourPayment>): Promise<LabourPayment> => {
  const res = await fetch(`${BASE}/payments/${id}`, {
    method: 'PATCH', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to update payment');
  return res.json();
};

export const deletePayment = async (id: string): Promise<void> => {
  const res = await fetch(`${BASE}/payments/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete payment');
};

export const getAttendanceByContractor = async (contractor_id: string): Promise<LabourAttendance[]> => {
  const res = await fetch(`${BASE}/attendance?contractor_id=${contractor_id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch attendance');
  return res.json();
};

export const getPaymentsByContractor = async (contractor_id: string): Promise<LabourPayment[]> => {
  const res = await fetch(`${BASE}/payments?contractor_id=${contractor_id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch payments');
  return res.json();
};

export interface LabourWageRow {
  contractor_id: string;
  contractor_name: string;
  daily_rate: number;
  total_days: number;
  gross_wages: number;
  total_paid: number;
  advances_given: number;
  balance_due: number;
}

export interface LabourAdvance {
  id: string;
  contractor_id: string;
  project_id: string;
  advance_date: string;
  amount: string;
  recovered_amount: string;
  notes: string | null;
  contractor?: LabourContractor;
}

export async function getWages(project_id?: string): Promise<LabourWageRow[]> {
  const params = project_id ? `?project_id=${project_id}` : '';
  const res = await fetch(`${BASE}/wages${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch wages');
  return res.json();
}

export async function getAdvances(project_id?: string): Promise<LabourAdvance[]> {
  const params = project_id ? `?project_id=${project_id}` : '';
  const res = await fetch(`${BASE}/advances${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch advances');
  return res.json();
}
