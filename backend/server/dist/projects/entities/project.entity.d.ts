import { ProjectStage } from './project-stage.entity';
export declare class Project {
    id: string;
    name: string;
    location: string | null;
    plot_size: string | null;
    start_date: string | null;
    expected_completion_date: string | null;
    project_type: string | null;
    total_estimated_budget: string | null;
    status: string;
    created_at: Date;
    updated_at: Date;
    stages: ProjectStage[];
}
