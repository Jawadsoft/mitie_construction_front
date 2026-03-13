export class CreateProjectDto {
  name: string;
  location?: string;
  plot_size?: string;
  start_date?: string;
  expected_completion_date?: string;
  project_type?: string;
  total_estimated_budget?: number;
  status?: string;
}
