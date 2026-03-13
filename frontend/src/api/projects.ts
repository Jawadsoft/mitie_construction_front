const API = '';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface Project {
  id: string;
  name: string;
  location: string | null;
  plot_size: string | null;
  start_date: string | null;
  expected_completion_date: string | null;
  project_type: string | null;
  total_estimated_budget: string | null;
  status: string;
  stages?: Stage[];
  computed?: {
    total_stage_budget: number;
    avg_completion_percent: number;
    stage_count: number;
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
  budget?: {
    labour_budget: string;
    material_budget: string;
    equipment_budget: string;
    other_budget: string;
    total_budget: string;
  };
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

export async function createProject(data: Partial<Project>): Promise<Project> {
  const res = await fetch(`${API}/api/projects`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  const res = await fetch(`${API}/api/projects/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API}/api/projects/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete project');
}

export async function createStage(projectId: string, data: Partial<Stage> & {
  labour_budget?: number;
  material_budget?: number;
  equipment_budget?: number;
  other_budget?: number;
}): Promise<Stage> {
  const res = await fetch(`${API}/api/projects/${projectId}/stages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create stage');
  return res.json();
}

export async function updateStage(stageId: string, data: Partial<Stage> & {
  labour_budget?: number;
  material_budget?: number;
  equipment_budget?: number;
  other_budget?: number;
}): Promise<Stage> {
  const res = await fetch(`${API}/api/projects/stages/${stageId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update stage');
  return res.json();
}
