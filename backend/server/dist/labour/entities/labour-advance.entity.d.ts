import { LabourContractor } from './labour-contractor.entity';
export declare class LabourAdvance {
    id: string;
    contractor_id: string;
    project_id: string;
    advance_date: string;
    amount: string;
    recovered_amount: string;
    reference_no: string | null;
    notes: string | null;
    created_at: Date;
    contractor: LabourContractor;
}
