export declare class PurchaseOrder {
    id: string;
    project_id: string;
    project_stage_id: string | null;
    supplier_id: string;
    order_date: string;
    expected_delivery: string | null;
    status: string;
    total_amount: string;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
}
