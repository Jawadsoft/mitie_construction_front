import { API_BASE } from './config';
const API = API_BASE;

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type ProjectTypeCode = 'READY_PROPERTY' | 'LAND';
export type ProjectStrategy = 'DIRECT_SALE' | 'DEVELOPMENT';

export const READY_PROPERTY_SUBTYPES = [
  'ALREADY_CONSTRUCTED_HOUSE',
  'APARTMENT',
  'COMMERCIAL_SHOP',
  'WAREHOUSE',
] as const;

export const LAND_SUBTYPES = [
  'EMPTY_PLOT',
  'RAW_LAND',
  'AGRICULTURAL_LAND',
  'COMMERCIAL_PLOT',
] as const;

export type ProjectSubtype =
  | (typeof READY_PROPERTY_SUBTYPES)[number]
  | (typeof LAND_SUBTYPES)[number];

export const TYPE_LABELS: Record<ProjectTypeCode, string> = {
  READY_PROPERTY: 'Ready Property',
  LAND: 'Land',
};

export const SUBTYPE_LABELS: Record<ProjectSubtype, string> = {
  ALREADY_CONSTRUCTED_HOUSE: 'Already Constructed House',
  APARTMENT: 'Apartment',
  COMMERCIAL_SHOP: 'Commercial Shop',
  WAREHOUSE: 'Warehouse',
  EMPTY_PLOT: 'Empty Plot',
  RAW_LAND: 'Raw Land',
  AGRICULTURAL_LAND: 'Agricultural Land',
  COMMERCIAL_PLOT: 'Commercial Plot',
};

export const STRATEGY_LABELS: Record<ProjectStrategy, string> = {
  DIRECT_SALE: 'Direct Sale',
  DEVELOPMENT: 'Development',
};

export function subtypesForType(type: ProjectTypeCode): ProjectSubtype[] {
  return type === 'READY_PROPERTY' ? [...READY_PROPERTY_SUBTYPES] : [...LAND_SUBTYPES];
}

/** Normalize rows that may still have legacy category/purpose fields. */
export function normalizeProjectFields(p: Partial<Project>): {
  project_type: ProjectTypeCode | null;
  project_subtype: ProjectSubtype | string | null;
  project_strategy: ProjectStrategy | null;
} {
  let project_type = p.project_type as string | null | undefined;
  if (project_type === 'LAND_ONLY') project_type = 'LAND';
  if (
    project_type !== 'READY_PROPERTY' &&
    project_type !== 'LAND' &&
    (p as any).project_category
  ) {
    const c = (p as any).project_category;
    project_type = c === 'LAND_ONLY' || c === 'LAND' ? 'LAND' : c === 'READY_PROPERTY' ? 'READY_PROPERTY' : null;
  }
  if (project_type !== 'READY_PROPERTY' && project_type !== 'LAND') project_type = null;

  let project_strategy = p.project_strategy as string | null | undefined;
  if (!project_strategy && (p as any).project_purpose) {
    const purp = (p as any).project_purpose;
    if (purp === 'BUY_SELL') project_strategy = 'DIRECT_SALE';
    else if (purp === 'BUY_DEVELOP') project_strategy = 'DEVELOPMENT';
  }
  if (project_strategy !== 'DIRECT_SALE' && project_strategy !== 'DEVELOPMENT') {
    project_strategy = null;
  }

  return {
    project_type: project_type as ProjectTypeCode | null,
    project_subtype: p.project_subtype ?? null,
    project_strategy: project_strategy as ProjectStrategy | null,
  };
}

export interface Project {
  id: string;
  name: string;
  location: string | null;
  owner_name?: string | null;
  manager_name?: string | null;
  /** Legacy free-text plot size */
  plot_size: string | null;
  /** Canonical area in square feet */
  plot_size_sqft: string | number | null;
  start_date: string | null;
  expected_completion_date: string | null;
  project_type: ProjectTypeCode | string | null;
  project_subtype: ProjectSubtype | string | null;
  project_strategy: ProjectStrategy | string | null;
  asset_class?: string | null;
  project_category?: string | null;
  project_purpose?: string | null;
  total_estimated_budget: string | null;
  target_sale_price: string | null;
  status: string;
  sold_as_is?: boolean;
  sold_at?: string | null;
  sold_price?: string | number | null;
  sold_buyer_name?: string | null;
  sold_notes?: string | null;
  stages?: Stage[];
  computed?: {
    total_stage_budget: number;
    avg_completion_percent: number;
    stage_count: number;
    total_spent?: number;
    total_collected?: number;
    sold_value?: number;
    profit?: number;
    profit_margin_pct?: number;
    fund_receipts?: number;
    budget_used_pct?: number;
    collection_pct?: number;
  };
}

export interface Stage {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  sequence_order: number;
  start_date: string | null;
  end_date: string | null;
  completion_percent: string;
  status: string;
  actual_cost?: number;
  budget?: {
    labour_budget: string;
    material_budget: string;
    equipment_budget: string;
    other_budget: string;
    total_budget: string;
  };
}

async function readError(res: Response, fallback: string) {
  try {
    const data = await res.json();
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (typeof data?.message === 'string') return data.message;
  } catch { /* ignore */ }
  return fallback;
}

export async function getProjects(): Promise<Project[]> {
  const res = await fetch(`${API}/api/projects`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function getProject(id: string): Promise<Project> {
  const res = await fetch(`${API}/api/projects/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

export interface ProjectActivityItem {
  occurred_at: string;
  category: string;
  action: string;
  description: string;
  amount: number | null;
  reference: string | null;
  entity_type: string;
  entity_id: string | null;
}

export interface ProjectActivityLog {
  project_id: string;
  project_name: string;
  total: number;
  activities: ProjectActivityItem[];
}

export async function getProjectActivity(id: string): Promise<ProjectActivityLog> {
  const res = await fetch(`${API}/api/projects/${id}/activity`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await readError(res, 'Failed to fetch project activity log'));
  return res.json();
}

export async function createProject(data: Partial<Project>): Promise<Project> {
  const res = await fetch(`${API}/api/projects`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to create project'));
  return res.json();
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  const res = await fetch(`${API}/api/projects/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to update project'));
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API}/api/projects/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to delete project'));
}

export async function sellProjectDuringConstruction(
  id: string,
  data: {
    buyer_name: string;
    sale_price?: number | null;
    sale_date?: string | null;
    notes?: string | null;
  },
): Promise<Project> {
  const res = await fetch(`${API}/api/projects/${id}/sell-during-construction`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to sell project during construction'));
  return res.json();
}

export async function createStage(
  projectId: string,
  data: Partial<Stage> & Record<string, unknown>,
): Promise<Stage> {
  const res = await fetch(`${API}/api/projects/${projectId}/stages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to create stage'));
  return res.json();
}

export async function updateStage(stageId: string, data: Partial<Stage> & Record<string, unknown>): Promise<Stage> {
  const res = await fetch(`${API}/api/projects/stages/${stageId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to update stage'));
  return res.json();
}
