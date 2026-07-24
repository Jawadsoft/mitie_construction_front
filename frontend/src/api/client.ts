import { API_BASE } from './config';

export { API_BASE };

export async function login(email: string, password: string) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error(
      API_BASE
        ? `Cannot reach API at ${API_BASE}. Check the URL and that the API is up.`
        : 'Cannot reach the API. Is Nest running on http://localhost:4000?',
    );
  }

  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const hint = API_BASE
      ? `API at ${API_BASE} did not return JSON (HTTP ${res.status}). Check VITE_API_URL and rebuild.`
      : `Nest did not return JSON (HTTP ${res.status}). Start the API with npm run dev in backend (port 4000), and use Vite npm run dev (not preview).`;
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
