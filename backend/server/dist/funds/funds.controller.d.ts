import { FundsService } from './funds.service';
export declare class FundsController {
    private readonly svc;
    constructor(svc: FundsService);
    findSources(project_id?: string): Promise<any>;
    findOneSource(id: string): Promise<import("./entities/fund-source.entity").FundSource>;
    createSource(dto: any): Promise<import("./entities/fund-source.entity").FundSource>;
    updateSource(id: string, dto: any): Promise<import("./entities/fund-source.entity").FundSource>;
    deleteSource(id: string): Promise<{
        deleted: boolean;
    }>;
    findTransactions(fund_source_id?: string): Promise<import("./entities/fund-transaction.entity").FundTransaction[]>;
    createTransaction(dto: any): Promise<import("./entities/fund-transaction.entity").FundTransaction>;
    updateTransaction(id: string, dto: any): Promise<import("./entities/fund-transaction.entity").FundTransaction | null>;
    deleteTransaction(id: string): Promise<{
        deleted: boolean;
    }>;
}
