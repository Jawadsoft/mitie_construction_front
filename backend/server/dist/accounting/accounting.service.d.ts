import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
export declare class AccountingService implements OnModuleInit {
    private readonly accountsRepo;
    private readonly jeRepo;
    private readonly jelRepo;
    constructor(accountsRepo: Repository<Account>, jeRepo: Repository<JournalEntry>, jelRepo: Repository<JournalEntryLine>);
    onModuleInit(): Promise<void>;
    findAccounts(): Promise<Account[]>;
    createAccount(dto: Partial<Account>): Promise<Account>;
    findJournalEntries(project_id?: string): Promise<JournalEntry[]>;
    findJournalEntry(id: string): Promise<{
        lines: JournalEntryLine[];
        id: string;
        entry_date: string;
        reference_no: string | null;
        description: string | null;
        status: string;
        project_id: string | null;
        created_at: Date;
        updated_at: Date;
    }>;
    createJournalEntry(dto: {
        entry: Partial<JournalEntry>;
        lines: Partial<JournalEntryLine>[];
    }): Promise<{
        lines: JournalEntryLine[];
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
