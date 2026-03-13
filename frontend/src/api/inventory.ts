import { getAuthHeaders } from './client';

const BASE = '/api/inventory';
const h = () => getAuthHeaders();
const json = (r: Response) => { if (!r.ok) return r.json().then(e => { throw new Error(e.message || 'Request failed'); }); return r.json(); };

export interface Material {
  id: string; name: string; unit: string; category: string | null;
  min_stock_level: string; standard_unit_cost: string;
  description: string | null; is_active: boolean; created_at: string;
}

export interface StockSummary extends Material {
  material_id: string; material_name: string;
  total_in: number; total_out: number; current_stock: number;
  stock_value: number; is_low_stock: boolean;
}

export interface StockLedgerRow {
  id: string; material_id: string; movement_type: string;
  quantity: string; unit_cost: string; total_cost: string;
  project_id: string | null; project_stage_id: string | null;
  purchase_order_id: string | null; movement_date: string;
  reference_no: string | null; notes: string | null; created_at: string;
  material?: Material;
}

export interface MaterialIssue {
  id: string; material_id: string; project_id: string;
  project_stage_id: string | null; issue_date: string;
  quantity: string; unit_cost: string; total_cost: string;
  purpose: string | null; reference_no: string | null; notes: string | null;
  created_at: string; material?: Material;
}

export interface ProjectUtilization {
  project_id: string; total_material_cost: number;
  by_material: {
    material_id: string; material_name: string; unit: string; category: string | null;
    total_qty: number; total_cost: number;
    stages: { stage_id: string; stage_name: string; qty: number; cost: number }[];
  }[];
}

export const getMaterials = (category?: string): Promise<Material[]> =>
  fetch(`${BASE}/materials${category ? `?category=${category}` : ''}`, { headers: h() }).then(json);

export const getMaterial = (id: string): Promise<Material> =>
  fetch(`${BASE}/materials/${id}`, { headers: h() }).then(json);

export const getCategories = (): Promise<string[]> =>
  fetch(`${BASE}/materials/categories`, { headers: h() }).then(json);

export const createMaterial = (dto: Partial<Material>): Promise<Material> =>
  fetch(`${BASE}/materials`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }).then(json);

export const deleteMaterial = (id: string): Promise<void> =>
  fetch(`${BASE}/materials/${id}`, { method: 'DELETE', headers: h() }).then(r => { if (!r.ok) throw new Error('Failed to delete material'); });

export const updateMaterial = (id: string, dto: Partial<Material>): Promise<Material> =>
  fetch(`${BASE}/materials/${id}`, { method: 'PATCH', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }).then(json);

export const getStockSummary = (project_id?: string): Promise<StockSummary[]> =>
  fetch(`${BASE}/stock${project_id ? `?project_id=${project_id}` : ''}`, { headers: h() }).then(json);

export const getLowStockAlerts = (): Promise<StockSummary[]> =>
  fetch(`${BASE}/stock/low-alerts`, { headers: h() }).then(json);

export const getLedger = (filters?: { material_id?: string; project_id?: string; movement_type?: string; from?: string; to?: string }): Promise<StockLedgerRow[]> => {
  const p = new URLSearchParams();
  if (filters?.material_id) p.append('material_id', filters.material_id);
  if (filters?.project_id) p.append('project_id', filters.project_id);
  if (filters?.movement_type) p.append('movement_type', filters.movement_type);
  if (filters?.from) p.append('from', filters.from);
  if (filters?.to) p.append('to', filters.to);
  return fetch(`${BASE}/ledger?${p}`, { headers: h() }).then(json);
};

export const receiveStock = (dto: { material_id: string; quantity: string; unit_cost: string; movement_date: string; project_id?: string; purchase_order_id?: string; reference_no?: string; notes?: string }): Promise<StockLedgerRow> =>
  fetch(`${BASE}/receive`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }).then(json);

export const issueMaterial = (dto: { material_id: string; project_id: string; project_stage_id?: string; quantity: string; unit_cost?: string; issue_date: string; purpose?: string; reference_no?: string; notes?: string }): Promise<MaterialIssue> =>
  fetch(`${BASE}/issue`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }).then(json);

export const adjustStock = (dto: { material_id: string; quantity: string; movement_type: 'ADJUSTMENT' | 'RETURN'; movement_date: string; unit_cost?: string; notes?: string }): Promise<StockLedgerRow> =>
  fetch(`${BASE}/adjust`, { method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }).then(json);

export const getIssues = (filters?: { project_id?: string; project_stage_id?: string; material_id?: string }): Promise<MaterialIssue[]> => {
  const p = new URLSearchParams();
  if (filters?.project_id) p.append('project_id', filters.project_id);
  if (filters?.project_stage_id) p.append('project_stage_id', filters.project_stage_id);
  if (filters?.material_id) p.append('material_id', filters.material_id);
  return fetch(`${BASE}/issues?${p}`, { headers: h() }).then(json);
};

export const getProjectUtilization = (project_id: string): Promise<ProjectUtilization> =>
  fetch(`${BASE}/utilization/${project_id}`, { headers: h() }).then(json);
