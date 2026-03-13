import { AccountingService } from './accounting.service';
export declare class AccountingController {
    private readonly svc;
    constructor(svc: AccountingService);
    findAccounts(): Promise<import("./entities/account.entity").Account[]>;
    createAccount(dto: any): Promise<import("./entities/account.entity").Account>;
    findJournalEntries(project_id?: string): Promise<import("./entities/journal-entry.entity").JournalEntry[]>;
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
    getTrialBalance(): Promise<any[]>;
}
