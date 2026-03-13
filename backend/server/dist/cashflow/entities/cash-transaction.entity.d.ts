export declare class CashTransaction {
    id: string;
    transaction_date: string;
    type: 'IN' | 'OUT';
    amount: string;
    method: string;
    reference_no: string | null;
    description: string | null;
    project_id: string | null;
    project_stage_id: string | null;
    related_entity_type: string | null;
    related_entity_id: string | null;
    created_at: Date;
    updated_at: Date;
}
