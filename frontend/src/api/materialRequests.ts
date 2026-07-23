import { getAuthHeaders } from './client';

export interface MaterialRequestItem {
  id?: string;
  material_id?: string | null;
  material_name: string;
  unit: string;
  quantity_requested: string;
  quantity_approved?: string | null;
  estimated_unit_cost?: string | null;
  notes?: string | null;
}

export interface MaterialRequest {
  id: string;
  request_no: string;
  project_id: string;
  project_stage_id: string | null;
  requested_by: string;
  request_date: string;
  needed_by_date: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  purchase_order_id: string | null;
  items?: MaterialRequestItem[];
  created_at: string;
}

const BASE = '/api/material-requests';

export async function getMaterialRequests(project_id?: string, status?: string): Promise<MaterialRequest[]> {
  const params = new URLSearchParams();
  if (project_id) params.set('project_id', project_id);
  if (status) params.set('status', status);
  const qs = params.toString() ? `?${params}` : '';
  const res = await fetch(`${BASE}${qs}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch material requests');
  return res.json();
}

export async function getMaterialRequest(id: string): Promise<MaterialRequest> {
  const res = await fetch(`${BASE}/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch material request');
  return res.json();
}

export async function createMaterialRequest(dto: {
  request: Partial<MaterialRequest>;
  items: MaterialRequestItem[];
}): Promise<MaterialRequest> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create material request');
  return data;
}

export async function submitMaterialRequest(id: string): Promise<MaterialRequest> {
  const res = await fetch(`${BASE}/${id}/submit`, { method: 'POST', headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to submit request');
  return data;
}

export async function approveMaterialRequest(
  id: string,
  dto: { approved_by: string; items?: { id: string; quantity_approved: string }[] },
): Promise<MaterialRequest> {
  const res = await fetch(`${BASE}/${id}/approve`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to approve request');
  return data;
}

export async function rejectMaterialRequest(
  id: string,
  dto: { approved_by: string; rejection_reason?: string },
): Promise<MaterialRequest> {
  const res = await fetch(`${BASE}/${id}/reject`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reject request');
  return data;
}

export async function convertMaterialRequestToPo(
  id: string,
  dto: { supplier_id: string; created_by?: string; order_date?: string; notes?: string },
): Promise<MaterialRequest> {
  const res = await fetch(`${BASE}/${id}/convert-to-po`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to convert to PO');
  return data;
}
