import { Project } from './project.entity';
import { StageBudget } from './stage-budget.entity';
import { StageProgress } from './stage-progress.entity';
export declare class ProjectStage {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    sequence_order: number;
    start_date: string | null;
    end_date: string | null;
    completion_percent: string;
    status: string;
    created_at: Date;
    updated_at: Date;
    project: Project;
    budget: StageBudget;
    progressLogs: StageProgress[];
}
