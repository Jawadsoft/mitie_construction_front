import { getAuthHeaders } from './client';

export interface LandParcel {
  id: string;
  project_id: string | null;
  plot_number: string;
  owner_name: string;
  owner_cnic: string | null;
  owner_phone: string | null;
  location: string;
  area: string | null;
  area_sqft: string | null;
  purchase_agreement_no: string | null;
  purchase_agreement_date: string | null;
  purchase_agreement_file: string | null;
  sale_deed_no: string | null;
  sale_deed_date: string | null;
  sale_deed_registrar: string | null;
  sale_deed_file: string | null;
  purchase_price: string | null;
  purchase_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const BASE = '/api/land/parcels';

export async function getLandParcels(project_id?: string): Promise<LandParcel[]> {
  const params = project_id ? `?project_id=${project_id}` : '';
  const res = await fetch(`${BASE}${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch land parcels');
  return res.json();
}

export async function createLandParcel(dto: Partial<LandParcel>): Promise<LandParcel> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to create land parcel');
  return res.json();
}

export async function updateLandParcel(id: string, dto: Partial<LandParcel>): Promise<LandParcel> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to update land parcel');
  return res.json();
}

export async function deleteLandParcel(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete land parcel');
}
