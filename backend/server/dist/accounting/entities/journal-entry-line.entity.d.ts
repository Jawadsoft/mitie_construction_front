import { JournalEntry } from './journal-entry.entity';
import { Account } from './account.entity';
export declare class JournalEntryLine {
    id: string;
    journal_entry_id: string;
    account_id: string;
    dr_cr: string;
    amount: string;
    narration: string | null;
    journal_entry: JournalEntry;
    account: Account;
}
