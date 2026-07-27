import { DataSource } from 'typeorm';
export interface NotificationItem {
    id: string;
    type: 'low_stock' | 'budget_exceeded' | 'mr_pending' | 'installment_overdue';
    title: string;
    body: string;
    href: string;
    created_at: string;
}
export declare class NotificationsService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    summary(): Promise<{
        items: NotificationItem[];
    }>;
}
