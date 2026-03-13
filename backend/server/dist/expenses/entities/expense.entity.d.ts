export declare class Expense {
    id: string;
    project_id: string;
    project_stage_id: string;
    category: string;
    vendor_type: string;
    supplier_id: string | null;
    contractor_id: string | null;
    payment_type: string;
    expense_date: string;
    amount: string;
    description: string | null;
    cash_transaction_id: string | null;
    created_at: Date;
    updated_at: Date;
}
