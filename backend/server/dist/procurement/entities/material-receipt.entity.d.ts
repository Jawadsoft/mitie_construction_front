import { PurchaseOrder } from './purchase-order.entity';
export declare class MaterialReceipt {
    id: string;
    purchase_order_id: string;
    receipt_date: string;
    status: string;
    notes: string | null;
    created_at: Date;
    purchase_order: PurchaseOrder;
}
