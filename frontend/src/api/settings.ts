import { API_BASE } from './config';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type MeasurementStandard = 'PAKISTAN' | 'CUSTOM';

export interface MeasurementSettings {
  standard: MeasurementStandard;
  marla_sqft: number;
  gazz_sqft: number;
}

async function readError(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.message || data.error?.message || fallback;
  } catch {
    return fallback;
  }
}

export async function getMeasurementSettings(): Promise<MeasurementSettings> {
  const res = await fetch(`${API_BASE}/api/settings/measurement`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to load measurement settings'));
  return res.json();
}

export async function updateMeasurementSettings(body: {
  standard: MeasurementStandard;
  marla_sqft?: number;
}): Promise<MeasurementSettings> {
  const res = await fetch(`${API_BASE}/api/settings/measurement`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to save measurement settings'));
  return res.json();
}
