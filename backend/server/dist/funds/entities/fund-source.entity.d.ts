export declare const FUND_SOURCE_STATUSES: readonly ["Committed", "Partially_Received", "Fully_Received", "Cancelled"];
export declare class FundSource {
    id: string;
    project_id: string | null;
    bank_account_id: string | null;
    source_name: string;
    source_type: string;
    total_committed: string;
    received_so_far: string;
    status: string;
    expected_date: string | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
}
