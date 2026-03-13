import { getAuthHeaders } from './client';

export interface Role { id: string; name: string; description: string | null; }
export interface User {
  id: string; name: string; email: string; role_id: string;
  is_active: boolean; last_login_at: string | null; created_at: string;
  role?: Role;
}

const BASE = '/api/users';
const h = () => getAuthHeaders();

export async function getUsers(): Promise<User[]> {
  const r = await fetch(BASE, { headers: h() });
  if (!r.ok) throw new Error('Failed to fetch users');
  return r.json();
}

export async function getRoles(): Promise<Role[]> {
  const r = await fetch(`${BASE}/roles`, { headers: h() });
  if (!r.ok) throw new Error('Failed to fetch roles');
  return r.json();
}

export async function createUser(dto: { name: string; email: string; password: string; role_id: string }): Promise<User> {
  const r = await fetch(BASE, {
    method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || 'Failed to create user');
  return data;
}

export async function updateUser(id: string, dto: Partial<{ name: string; email: string; role_id: string; is_active: boolean; password: string }>): Promise<User> {
  const r = await fetch(`${BASE}/${id}`, {
    method: 'PATCH', headers: { ...h(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || 'Failed to update user');
  return data;
}

export async function deactivateUser(id: string) {
  const r = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: h() });
  if (!r.ok) throw new Error('Failed to deactivate user');
  return r.json();
}
