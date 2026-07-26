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

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** Parse API error; on 401 ask user to re-login (write routes require a valid JWT). */
export async function readApiError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({} as { message?: string | string[] }));
  const raw = data?.message;
  const msg = Array.isArray(raw) ? raw.join(', ') : raw || fallback;
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    return 'Session expired or not logged in. Please log out and log in again, then retry.';
  }
  if (res.status === 403) {
    return msg || 'You do not have permission for this action.';
  }
  return msg || fallback;
}
