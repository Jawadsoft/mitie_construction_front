export declare class ExpensePayment {
    id: string;
    expense_id: string;
    paid_date: string;
    amount: string;
    payment_method: string;
    bank_account_id: string | null;
    notes: string | null;
    created_at: Date;
}
