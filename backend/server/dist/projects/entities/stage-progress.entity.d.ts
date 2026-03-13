import { ProjectStage } from './project-stage.entity';
export declare class StageProgress {
    id: string;
    project_stage_id: string;
    report_date: string;
    completion_percent: string;
    notes: string | null;
    has_delay: boolean;
    created_at: Date;
    stage: ProjectStage;
}
