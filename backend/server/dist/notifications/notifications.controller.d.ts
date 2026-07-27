import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly svc;
    constructor(svc: NotificationsService);
    summary(): Promise<{
        items: import("./notifications.service").NotificationItem[];
    }>;
}
