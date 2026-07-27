import { LabourContractor } from './labour-contractor.entity';
export declare class LabourAttendance {
    id: string;
    contractor_id: string;
    project_id: string;
    project_stage_id: string | null;
    attendance_date: string;
    present_days: string;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
    contractor: LabourContractor;
}
