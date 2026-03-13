import { Material } from './material.entity';
export declare class MaterialIssue {
    id: string;
    material_id: string;
    project_id: string;
    project_stage_id: string | null;
    issue_date: string;
    quantity: string;
    unit_cost: string;
    total_cost: string;
    purpose: string | null;
    reference_no: string | null;
    notes: string | null;
    created_at: Date;
    material: Material;
}
