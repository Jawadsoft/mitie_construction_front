import { getAuthHeaders } from './client';

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  cnic: string | null;
  address: string | null;
}

export interface PropertyUnit {
  id: string;
  project_id: string;
  unit_number: string;
  unit_type: string | null;
  area_sqft: string | null;
  floor: string | null;
  list_price: string;
  status: string;
  notes: string | null;
}

export interface SaleInstallment {
  id: string;
  sale_id: string;
  due_date: string;
  due_amount: string;
  paid_amount: string;
  paid_date: string | null;
  status: string;
  notes: string | null;
}

export interface Sale {
  id: string;
  property_unit_id: string;
  customer_id: string;
  sale_date: string;
  total_sale_price: string;
  total_paid: string;
  status: string;
  notes: string | null;
  customer?: Customer;
  property_unit?: PropertyUnit;
  installments?: SaleInstallment[];
}

const BASE = '/api/sales';

export async function getCustomers(): Promise<Customer[]> {
  const res = await fetch(`${BASE}/customers`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
}

export async function createCustomer(dto: Partial<Customer>): Promise<Customer> {
  const res = await fetch(`${BASE}/customers`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to create customer');
  return res.json();
}

export async function getPropertyUnits(project_id?: string, status?: string): Promise<PropertyUnit[]> {
  const params = new URLSearchParams();
  if (project_id) params.append('project_id', project_id);
  if (status) params.append('status', status);
  const res = await fetch(`${BASE}/units?${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch property units');
  return res.json();
}

export async function createPropertyUnit(dto: Partial<PropertyUnit>): Promise<PropertyUnit> {
  const res = await fetch(`${BASE}/units`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to create property unit');
  return res.json();
}

export async function getSales(project_id?: string, customer_id?: string): Promise<Sale[]> {
  const params = new URLSearchParams();
  if (project_id) params.append('project_id', project_id);
  if (customer_id) params.append('customer_id', customer_id);
  const qs = params.toString();
  const res = await fetch(`${BASE}/list${qs ? '?' + qs : ''}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch sales');
  return res.json();
}

export async function getSale(id: string): Promise<Sale> {
  const res = await fetch(`${BASE}/list/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch sale');
  return res.json();
}

export async function createSale(dto: { sale: Partial<Sale>; installments?: Partial<SaleInstallment>[] }): Promise<Sale> {
  const res = await fetch(`${BASE}/list`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to create sale');
  return res.json();
}

export async function getInstallments(sale_id?: string, status?: string): Promise<SaleInstallment[]> {
  const params = new URLSearchParams();
  if (sale_id) params.append('sale_id', sale_id);
  if (status) params.append('status', status);
  const res = await fetch(`${BASE}/installments?${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch installments');
  return res.json();
}

export async function updateCustomer(id: string, dto: Partial<Customer>): Promise<Customer> {
  const res = await fetch(`${BASE}/customers/${id}`, {
    method: 'PATCH', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to update customer');
  return res.json();
}

export async function deleteCustomer(id: string): Promise<void> {
  const res = await fetch(`${BASE}/customers/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete customer');
}

export async function updatePropertyUnit(id: string, dto: Partial<PropertyUnit>): Promise<PropertyUnit> {
  const res = await fetch(`${BASE}/units/${id}`, {
    method: 'PATCH', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to update unit');
  return res.json();
}

export async function deletePropertyUnit(id: string): Promise<void> {
  const res = await fetch(`${BASE}/units/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete unit');
}

export async function updateSale(id: string, dto: Partial<Sale>): Promise<Sale> {
  const res = await fetch(`${BASE}/list/${id}`, {
    method: 'PATCH', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('Failed to update sale');
  return res.json();
}

export async function deleteSale(id: string): Promise<void> {
  const res = await fetch(`${BASE}/list/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete sale');
}

export async function recordPayment(installment_id: string, paid_amount: string, paid_date: string): Promise<SaleInstallment> {
  const res = await fetch(`${BASE}/installments/${installment_id}/pay`, {
    method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ paid_amount, paid_date }),
  });
  if (!res.ok) throw new Error('Failed to record payment');
  return res.json();
}
