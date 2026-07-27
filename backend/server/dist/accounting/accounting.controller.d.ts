import { AccountingService } from './accounting.service';
export declare class AccountingController {
    private readonly svc;
    constructor(svc: AccountingService);
    findAccounts(): Promise<import("./entities/account.entity").Account[]>;
    createAccount(dto: any): Promise<import("./entities/account.entity").Account>;
    updateAccount(id: string, dto: any): Promise<import("./entities/account.entity").Account | null>;
    findJournalEntries(project_id?: string): Promise<Record<string, unknown>[]>;
    findJournalEntry(id: string): Promise<{
        lines: import("./entities/journal-entry-line.entity").JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_at: Date;
        updated_at: Date;
    }>;
    createJournalEntry(dto: any): Promise<{
        lines: import("./entities/journal-entry-line.entity").JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_at: Date;
        updated_at: Date;
    }>;
    purgeOrphanAutoJournals(): Promise<{
        deleted: number;
        references: string[];
    }>;
    rebuildAllVoucherJournals(body?: {
        apply?: boolean;
        default_collection_bank_id?: string | null;
    }): Promise<{
        mode: "apply" | "dry-run";
        orphans_purged: number;
        orphan_refs: string[];
        bank_openings_synced: number;
        expenses_rebuilt: number;
        expense_payments_rebuilt: number;
        sales_rebuilt: number;
        payments_rebuilt: number;
        payments_to_bank: number;
        payments_left_on_cash: string[];
        funds_rebuilt: number;
        parent_cash_lines_moved: number;
        missing_before: Record<string, number>;
        unbalanced_after: {
            id: string;
            reference_no: string;
            debit: string;
            credit: string;
        }[];
        errors: string[];
    }>;
    postJournalEntry(id: string): Promise<{
        lines: import("./entities/journal-entry-line.entity").JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_at: Date;
        updated_at: Date;
    }>;
    updateJournalEntry(id: string, dto: any): Promise<{
        lines: import("./entities/journal-entry-line.entity").JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_at: Date;
        updated_at: Date;
    }>;
    deleteJournalEntry(id: string): Promise<{
        deleted: boolean;
    }>;
    getTrialBalance(from?: string, to?: string): Promise<any[]>;
    getGeneralLedger(account_id: string, from?: string, to?: string, include_children?: string): Promise<{
        account: {
            id: string;
            code: string;
            name: string;
            type: string;
            is_head: boolean;
        };
        include_children: boolean;
        period: {
            from: string | null;
            to: string | null;
        };
        opening_balance: number;
        opening_balance_side: "" | "Dr" | "Cr";
        rows: Record<string, unknown>[];
        totals: {
            debit: number;
            credit: number;
            closing_balance: number;
            closing_balance_side: "" | "Dr" | "Cr";
        };
    }>;
    getBalanceSheet(as_of?: string): Promise<{
        as_of: string | null;
        assets: any[];
        liabilities: any[];
        equity: any[];
        net_income: number;
        total_assets: any;
        total_liabilities: any;
        total_equity: any;
        balanced: boolean;
    }>;
    findBankAccounts(): Promise<import("./entities/bank-account.entity").BankAccount[]>;
    createBankAccount(dto: any): Promise<import("./entities/bank-account.entity").BankAccount>;
    updateBankAccount(id: string, dto: any): Promise<import("./entities/bank-account.entity").BankAccount>;
    getStatementLines(id: string): Promise<import("./entities/bank-statement-line.entity").BankStatementLine[]>;
    createStatementLines(id: string, dto: {
        lines: any[];
    }): Promise<import("./entities/bank-statement-line.entity").BankStatementLine[]>;
    matchStatementLine(id: string, dto: any): Promise<import("./entities/bank-statement-line.entity").BankStatementLine | null>;
    findReconciliations(bank_account_id?: string): Promise<import("./entities/bank-reconciliation.entity").BankReconciliation[]>;
    createReconciliation(dto: any): Promise<import("./entities/bank-reconciliation.entity").BankReconciliation>;
    completeReconciliation(id: string): Promise<import("./entities/bank-reconciliation.entity").BankReconciliation | null>;
}
