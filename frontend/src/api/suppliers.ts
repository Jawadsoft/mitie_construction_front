import { getAuthHeaders } from './client';

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  payment_terms: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

const BASE = '/api/suppliers';

export async function getSuppliers(): Promise<Supplier[]> {
  const res = await fetch(BASE, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch suppliers');
  return res.json();
}

export async function createSupplier(data: Partial<Supplier>): Promise<Supplier> {
  const res = await fetch(BASE, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create supplier');
  return res.json();
}

export async function updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update supplier');
  return res.json();
}

export async function deleteSupplier(id: string) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete supplier');
  return res.json();
}

export async function getSupplier(id: string): Promise<Supplier> {
  const res = await fetch(`${BASE}/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch supplier');
  return res.json();
}
