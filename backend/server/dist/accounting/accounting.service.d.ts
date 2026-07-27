import { OnModuleInit } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { BankAccount } from './entities/bank-account.entity';
import { BankStatementLine } from './entities/bank-statement-line.entity';
import { BankReconciliation } from './entities/bank-reconciliation.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Sale } from '../sales/entities/sale.entity';
export declare class AccountingService implements OnModuleInit {
    private readonly accountsRepo;
    private readonly jeRepo;
    private readonly jelRepo;
    private readonly bankRepo;
    private readonly stmtRepo;
    private readonly reconRepo;
    private readonly dataSource;
    constructor(accountsRepo: Repository<Account>, jeRepo: Repository<JournalEntry>, jelRepo: Repository<JournalEntryLine>, bankRepo: Repository<BankAccount>, stmtRepo: Repository<BankStatementLine>, reconRepo: Repository<BankReconciliation>, dataSource: DataSource);
    onModuleInit(): Promise<void>;
    private nextCashBankChildCode;
    private bankCoaDisplayName;
    private createCashBankSubAccount;
    private postBankOpeningBalance;
    private syncBankOpeningBalance;
    private ensureBankCoaSubAccounts;
    findAccounts(): Promise<Account[]>;
    createAccount(dto: Partial<Account>): Promise<Account>;
    updateAccount(id: string, dto: Partial<Account>): Promise<Account | null>;
    findJournalEntries(project_id?: string): Promise<Record<string, unknown>[]>;
    findJournalEntry(id: string): Promise<{
        lines: JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_by: string | null;
        updated_by: string | null;
        posted_by: string | null;
        posted_at: Date | null;
        created_at: Date;
        updated_at: Date;
    }>;
    findAccountByCode(code: string, manager?: EntityManager): Promise<Account>;
    mapExpenseAccountCode(expense: Pick<Expense, 'vendor_type' | 'category'>): string;
    createJournalEntry(dto: {
        entry: Partial<JournalEntry>;
        lines: Partial<JournalEntryLine>[];
    }, manager?: EntityManager): Promise<{
        lines: JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_by: string | null;
        updated_by: string | null;
        posted_by: string | null;
        posted_at: Date | null;
        created_at: Date;
        updated_at: Date;
    }>;
    postJournalEntry(id: string, manager?: EntityManager, userId?: string): Promise<{
        lines: JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_by: string | null;
        updated_by: string | null;
        posted_by: string | null;
        posted_at: Date | null;
        created_at: Date;
        updated_at: Date;
    }>;
    updateJournalEntry(id: string, dto: {
        entry?: Partial<JournalEntry>;
        lines?: Partial<JournalEntryLine>[];
    }): Promise<{
        lines: JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_by: string | null;
        updated_by: string | null;
        posted_by: string | null;
        posted_at: Date | null;
        created_at: Date;
        updated_at: Date;
    }>;
    deleteJournalByReference(reference_no: string, manager?: EntityManager): Promise<{
        deleted: boolean;
        reference_no: string;
        id?: undefined;
    } | {
        deleted: boolean;
        reference_no: string;
        id: string;
    }>;
    deleteJournalsByReferencePrefix(reference_no: string, manager?: EntityManager): Promise<{
        deleted: number;
        reference_no: string;
    }>;
    deleteJournalEntry(id: string, manager?: EntityManager): Promise<{
        deleted: boolean;
    }>;
    purgeOrphanAutoJournals(): Promise<{
        deleted: number;
        references: string[];
    }>;
    private toDateOnly;
    private matchBankIdFromNarration;
    private resolveCollectionBankId;
    rebuildAllVoucherJournals(opts?: {
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
        unbalanced_after: Array<{
            id: string;
            reference_no: string;
            debit: string;
            credit: string;
        }>;
        errors: string[];
    }>;
    createAndPostEntry(dto: {
        entry: Partial<JournalEntry>;
        lines: Partial<JournalEntryLine>[];
    }, manager?: EntityManager): Promise<{
        lines: JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_by: string | null;
        updated_by: string | null;
        posted_by: string | null;
        posted_at: Date | null;
        created_at: Date;
        updated_at: Date;
    }>;
    postExpenseJournal(expense: Expense, manager?: EntityManager): Promise<{
        lines: JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_by: string | null;
        updated_by: string | null;
        posted_by: string | null;
        posted_at: Date | null;
        created_at: Date;
        updated_at: Date;
    }>;
    postExpenseBillPaymentJournal(expense: Expense, payment: {
        id: string;
        amount: string | number;
        paid_date: string;
        payment_method?: string;
        bank_account_id?: string | null;
    }, manager?: EntityManager): Promise<{
        lines: JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_by: string | null;
        updated_by: string | null;
        posted_by: string | null;
        posted_at: Date | null;
        created_at: Date;
        updated_at: Date;
    }>;
    postSaleJournal(sale: Sale, project_id?: string | null, manager?: EntityManager): Promise<{
        lines: JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_by: string | null;
        updated_by: string | null;
        posted_by: string | null;
        posted_at: Date | null;
        created_at: Date;
        updated_at: Date;
    }>;
    postSalePaymentJournal(sale: Sale, paidAmount: string | number, meta: {
        installment_id: string;
        paid_date: string;
        project_id?: string | null;
        bank_account_id?: string | null;
        reference_no?: string;
    }, manager?: EntityManager): Promise<{
        lines: JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_by: string | null;
        updated_by: string | null;
        posted_by: string | null;
        posted_at: Date | null;
        created_at: Date;
        updated_at: Date;
    }>;
    resolveBankAssetAccountId(bankAccountId: string | null | undefined, manager?: EntityManager): Promise<string>;
    mapFundCreditAccountCode(sourceType: string): string;
    postLabourPaymentJournal(payment: {
        id: string;
        contractor_id: string;
        project_id: string;
        payment_date: string;
        amount: string | number;
        payment_method?: string | null;
        notes?: string | null;
        contractor_name?: string | null;
        bank_account_id?: string | null;
    }, manager?: EntityManager): Promise<{
        lines: JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_by: string | null;
        updated_by: string | null;
        posted_by: string | null;
        posted_at: Date | null;
        created_at: Date;
        updated_at: Date;
    }>;
    postFundReceiptJournal(meta: {
        fund_transaction_id: string;
        fund_source_id: string;
        source_name: string;
        source_type: string;
        bank_account_id: string | null;
        project_id: string | null;
        transaction_date: string;
        amount: string | number;
    }, manager?: EntityManager): Promise<{
        lines: JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_by: string | null;
        updated_by: string | null;
        posted_by: string | null;
        posted_at: Date | null;
        created_at: Date;
        updated_at: Date;
    }>;
    getTrialBalance(from?: string, to?: string): Promise<any[]>;
    private getAccountIdsWithDescendants;
    private balanceSide;
    private displayBalance;
    getGeneralLedger(account_id: string, from?: string, to?: string, includeChildren?: boolean): Promise<{
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
    findBankAccounts(): Promise<BankAccount[]>;
    createBankAccount(dto: Partial<BankAccount>): Promise<BankAccount>;
    updateBankAccount(id: string, dto: Partial<BankAccount> & {
        opening_date?: string;
        clear_opening?: boolean;
    }): Promise<BankAccount>;
    getStatementLines(bank_account_id: string): Promise<BankStatementLine[]>;
    createStatementLines(bank_account_id: string, lines: Partial<BankStatementLine>[]): Promise<BankStatementLine[]>;
    matchStatementLine(id: string, dto: {
        cash_transaction_id?: string | null;
        journal_entry_id?: string | null;
        reconciled?: boolean;
    }): Promise<BankStatementLine | null>;
    findReconciliations(bank_account_id?: string): Promise<BankReconciliation[]>;
    createReconciliation(dto: Partial<BankReconciliation>): Promise<BankReconciliation>;
    completeReconciliation(id: string): Promise<BankReconciliation | null>;
}
