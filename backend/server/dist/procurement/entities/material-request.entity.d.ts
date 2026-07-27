export declare class MaterialRequest {
    id: string;
    request_no: string;
    project_id: string;
    project_stage_id: string | null;
    requested_by: string;
    request_date: string;
    needed_by_date: string | null;
    status: string;
    approved_by: string | null;
    approved_at: Date | null;
    rejection_reason: string | null;
    notes: string | null;
    purchase_order_id: string | null;
    created_at: Date;
    updated_at: Date;
}
