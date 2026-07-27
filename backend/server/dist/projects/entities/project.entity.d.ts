import { ProjectStage } from './project-stage.entity';
export declare class Project {
    id: string;
    name: string;
    location: string | null;
    plot_size: string | null;
    plot_size_sqft: string | null;
    start_date: string | null;
    expected_completion_date: string | null;
    project_type: string | null;
    project_subtype: string | null;
    project_strategy: string | null;
    asset_class: string | null;
    project_category: string | null;
    project_purpose: string | null;
    total_estimated_budget: string | null;
    target_sale_price: string | null;
    status: string;
    sold_as_is: boolean;
    sold_at: string | null;
    sold_price: string | null;
    sold_buyer_name: string | null;
    sold_notes: string | null;
    created_at: Date;
    updated_at: Date;
    stages: ProjectStage[];
}
