export declare class Expense {
    id: string;
    project_id: string;
    project_stage_id: string;
    category: string;
    vendor_type: string;
    supplier_id: string | null;
    contractor_id: string | null;
    entry_mode: string;
    payment_type: string;
    bank_account_id: string | null;
    expense_date: string;
    amount: string;
    paid_amount: string;
    status: string;
    description: string | null;
    cash_transaction_id: string | null;
    created_at: Date;
    updated_at: Date;
}
