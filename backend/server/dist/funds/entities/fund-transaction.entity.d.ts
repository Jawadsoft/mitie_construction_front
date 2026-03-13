import { FundSource } from './fund-source.entity';
export declare class FundTransaction {
    id: string;
    fund_source_id: string;
    transaction_date: string;
    amount: string;
    reference_no: string | null;
    notes: string | null;
    cash_transaction_id: string | null;
    created_at: Date;
    fund_source: FundSource;
}
