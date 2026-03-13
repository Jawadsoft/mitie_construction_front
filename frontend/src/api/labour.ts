import { getAuthHeaders } from './client';

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
  payment_date: string;
  amount: string;
  payment_method: string;
  reference_no: string | null;
  notes: string | null;
  contractor?: LabourContractor;
}

const BASE = '/api/labour';

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
