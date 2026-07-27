import { ProjectStage } from './project-stage.entity';
export declare class StageBudget {
    id: string;
    project_stage_id: string;
    labour_budget: string;
    material_budget: string;
    equipment_budget: string;
    other_budget: string;
    total_budget: string;
    created_at: Date;
    updated_at: Date;
    stage: ProjectStage;
}
