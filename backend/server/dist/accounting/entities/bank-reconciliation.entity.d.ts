export declare class BankReconciliation {
    id: string;
    bank_account_id: string;
    period_start: string;
    period_end: string;
    statement_ending_balance: string | null;
    book_ending_balance: string | null;
    status: string;
    notes: string | null;
    created_by: string | null;
    created_at: Date;
    updated_at: Date;
}
