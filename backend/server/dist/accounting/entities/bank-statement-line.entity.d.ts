export declare class BankStatementLine {
    id: string;
    bank_account_id: string;
    statement_date: string;
    value_date: string | null;
    description: string | null;
    amount: string;
    reference: string | null;
    reconciled: boolean;
    cash_transaction_id: string | null;
    journal_entry_id: string | null;
    reconciled_at: Date | null;
    created_at: Date;
}
