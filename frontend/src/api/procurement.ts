import { getAuthHeaders } from './client';

export interface PoItem {
  id: string;
  material_name: string;
  unit: string | null;
  quantity: string;
  unit_price: string;
  total_price: string;
  received_qty: string;
}

export interface PurchaseOrder {
  id: string;
  project_id: string;
  supplier_id: string;
  order_date: string;
  expected_delivery: string | null;
  status: string;
  total_amount: string;
  notes: string | null;
  items?: PoItem[];
  created_at: string;
}

const BASE = '/api/procurement';

export async function getPurchaseOrders(project_id?: string): Promise<PurchaseOrder[]> {
  const params = project_id ? `?project_id=${project_id}` : '';
  const res = await fetch(`${BASE}${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch purchase orders');
  return res.json();
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const res = await fetch(`${BASE}/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch purchase order');
  return res.json();
}

export async function createPurchaseOrder(dto: { order: Partial<PurchaseOrder>; items: Partial<PoItem>[] }): Promise<PurchaseOrder> {
  const res = await fetch(BASE, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to create purchase order');
  return res.json();
}

export async function createReceipt(purchase_order_id: string, dto: { receipt_date: string; notes?: string }): Promise<void> {
  const res = await fetch(`${BASE}/${purchase_order_id}/receipts`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to record receipt');
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  const res = await fetch(`/api/procurement/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete purchase order');
}

export async function updatePurchaseOrder(id: string, dto: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to update purchase order');
  return res.json();
}
