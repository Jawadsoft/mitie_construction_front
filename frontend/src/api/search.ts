import { API_BASE, getAuthHeaders, readApiError } from './client';

export interface SearchHit {
  id: string;
  label: string;
  sub?: string;
}

export interface GlobalSearchResult {
  projects: SearchHit[];
  land: SearchHit[];
  customers: SearchHit[];
  sales: SearchHit[];
  expenses: SearchHit[];
  suppliers: SearchHit[];
}

export async function globalSearch(q: string): Promise<GlobalSearchResult> {
  const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res, 'Search failed'));
  return res.json();
}
