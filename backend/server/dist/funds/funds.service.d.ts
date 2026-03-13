import { Repository, DataSource } from 'typeorm';
import { FundSource } from './entities/fund-source.entity';
import { FundTransaction } from './entities/fund-transaction.entity';
export declare class FundsService {
    private readonly sourcesRepo;
    private readonly txRepo;
    private readonly dataSource;
    constructor(sourcesRepo: Repository<FundSource>, txRepo: Repository<FundTransaction>, dataSource: DataSource);
    findSources(project_id?: string): Promise<any>;
    findOneSource(id: string): Promise<FundSource>;
    createSource(dto: Partial<FundSource>): Promise<FundSource>;
    updateSource(id: string, dto: Partial<FundSource>): Promise<FundSource>;
    findTransactions(fund_source_id?: string): Promise<FundTransaction[]>;
    createTransaction(dto: Partial<FundTransaction>): Promise<FundTransaction>;
    deleteSource(id: string): Promise<{
        deleted: boolean;
    }>;
    updateTransaction(id: string, dto: Partial<FundTransaction>): Promise<FundTransaction | null>;
    deleteTransaction(id: string): Promise<{
        deleted: boolean;
    }>;
}
