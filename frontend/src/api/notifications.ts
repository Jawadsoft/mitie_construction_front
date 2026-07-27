import { API_BASE, getAuthHeaders, readApiError } from './client';

export type NotificationType =
  | 'low_stock'
  | 'budget_exceeded'
  | 'mr_pending'
  | 'installment_overdue';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  created_at: string;
}

export async function getNotificationSummary(): Promise<{ items: NotificationItem[] }> {
  const res = await fetch(`${API_BASE}/api/notifications/summary`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res, 'Failed to load notifications'));
  return res.json();
}
