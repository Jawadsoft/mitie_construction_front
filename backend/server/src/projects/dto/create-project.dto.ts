export class CreateProjectDto {
  name: string;
  location?: string;
  /** @deprecated Legacy free-text; prefer plot_size_sqft */
  plot_size?: string | null;
  /** Canonical area in square feet */
  plot_size_sqft?: number | null;
  start_date?: string;
  expected_completion_date?: string;
  /** READY_PROPERTY | LAND */
  project_type: string;
  project_subtype: string;
  /** DIRECT_SALE | DEVELOPMENT */
  project_strategy: string;
  /** Legacy aliases accepted and normalized server-side */
  project_category?: string;
  project_purpose?: string;
  total_estimated_budget?: number;
  target_sale_price?: number;
  status?: string;
}
