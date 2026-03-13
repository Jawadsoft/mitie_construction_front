export class CreateStageDto {
  name: string;
  description?: string;
  sequence_order?: number;
  start_date?: string;
  end_date?: string;
  completion_percent?: number;
  status?: string;
  labour_budget?: number;
  material_budget?: number;
  equipment_budget?: number;
  other_budget?: number;
}
