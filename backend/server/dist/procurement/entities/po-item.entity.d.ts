import { PurchaseOrder } from './purchase-order.entity';
export declare class PoItem {
    id: string;
    purchase_order_id: string;
    material_name: string;
    unit: string | null;
    quantity: string;
    unit_price: string;
    total_price: string;
    received_qty: string;
    purchase_order: PurchaseOrder;
}
