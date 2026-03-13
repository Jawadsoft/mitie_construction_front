import { LabourContractor } from './labour-contractor.entity';
export declare class LabourPayment {
    id: string;
    contractor_id: string;
    project_id: string;
    project_stage_id: string | null;
    payment_date: string;
    amount: string;
    payment_method: string;
    reference_no: string | null;
    notes: string | null;
    cash_transaction_id: string | null;
    created_at: Date;
    updated_at: Date;
    contractor: LabourContractor;
}
