import { OnModuleInit } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { FundSource } from './entities/fund-source.entity';
import { FundTransaction } from './entities/fund-transaction.entity';
import { AccountingService } from '../accounting/accounting.service';
export declare class FundsService implements OnModuleInit {
    private readonly sourcesRepo;
    private readonly txRepo;
    private readonly dataSource;
    private readonly accounting;
    private readonly logger;
    constructor(sourcesRepo: Repository<FundSource>, txRepo: Repository<FundTransaction>, dataSource: DataSource, accounting: AccountingService);
    onModuleInit(): Promise<void>;
    computeStatus(committed: number | string, received: number | string, current?: string | null): string;
    private refreshSourceStatus;
    findSources(filters?: {
        project_id?: string;
        bank_account_id?: string;
        status?: string;
    }): Promise<any>;
    findOneSource(id: string): Promise<FundSource>;
    createSource(dto: Partial<FundSource>): Promise<FundSource>;
    updateSource(id: string, dto: Partial<FundSource>): Promise<FundSource>;
    syncFundJournalDates(): Promise<void>;
    findTransactions(fund_source_id?: string): Promise<FundTransaction[]>;
    createTransaction(dto: Partial<FundTransaction>): Promise<FundTransaction>;
    deleteSource(id: string): Promise<{
        deleted: boolean;
    }>;
    private toDateOnly;
    updateTransaction(id: string, dto: Partial<FundTransaction>): Promise<FundTransaction>;
    deleteTransaction(id: string): Promise<{
        deleted: boolean;
    }>;
}
