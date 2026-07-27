import { FundsService } from './funds.service';
export declare class FundsController {
    private readonly svc;
    constructor(svc: FundsService);
    getInvestorLedger(): Promise<{
        total_committed: number;
        total_received: number;
        available_capital: number;
        remaining_commitments: number;
        entries: {
            id: string;
            source_name: string;
            source_type: string;
            status: string;
            committed: number;
            received: number;
            remaining: number;
            bank_account_id: string | null;
            bank_label: string | null;
            project_id: string | null;
            project_name: string | null;
            transactions: {
                id: string;
                transaction_date: string;
                amount: number;
                reference_no: string | null;
                notes: string | null;
            }[];
        }[];
    }>;
    findSources(project_id?: string, bank_account_id?: string, status?: string): Promise<any>;
    findOneSource(id: string): Promise<import("./entities/fund-source.entity").FundSource>;
    createSource(dto: any): Promise<import("./entities/fund-source.entity").FundSource>;
    updateSource(id: string, dto: any): Promise<import("./entities/fund-source.entity").FundSource>;
    deleteSource(id: string): Promise<{
        deleted: boolean;
    }>;
    findTransactions(fund_source_id?: string): Promise<import("./entities/fund-transaction.entity").FundTransaction[]>;
    createTransaction(dto: any): Promise<import("./entities/fund-transaction.entity").FundTransaction>;
    updateTransaction(id: string, dto: any): Promise<import("./entities/fund-transaction.entity").FundTransaction>;
    deleteTransaction(id: string): Promise<{
        deleted: boolean;
    }>;
}
