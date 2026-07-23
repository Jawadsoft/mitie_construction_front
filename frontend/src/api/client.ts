import { API_BASE } from './config';

export { API_BASE };

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const hint = API_BASE
      ? `API at ${API_BASE} did not return JSON (HTTP ${res.status}).`
      : 'No VITE_API_URL set — requests hit this site instead of Nest. Set VITE_API_URL to your Render API URL and rebuild.';
    throw new Error(`Invalid response from server. ${hint}`);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Login failed');
  }
  return data;
}

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}
