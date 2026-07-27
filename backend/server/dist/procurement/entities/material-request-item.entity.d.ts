import { MaterialRequest } from './material-request.entity';
export declare class MaterialRequestItem {
    id: string;
    material_request_id: string;
    material_id: string | null;
    material_name: string;
    unit: string;
    quantity_requested: string;
    quantity_approved: string | null;
    estimated_unit_cost: string | null;
    notes: string | null;
    material_request: MaterialRequest;
}
