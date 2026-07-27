export declare class CreateProjectDto {
    name: string;
    location?: string;
    plot_size?: string | null;
    plot_size_sqft?: number | null;
    start_date?: string;
    expected_completion_date?: string;
    project_type: string;
    project_subtype: string;
    project_strategy: string;
    project_category?: string;
    project_purpose?: string;
    total_estimated_budget?: number;
    target_sale_price?: number;
    status?: string;
}
