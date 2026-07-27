import { Material } from './material.entity';
export type MovementType = 'RECEIPT' | 'ISSUE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'RETURN';
export declare class StockLedger {
    id: string;
    material_id: string;
    movement_type: MovementType;
    quantity: string;
    unit_cost: string;
    total_cost: string;
    project_id: string | null;
    project_stage_id: string | null;
    purchase_order_id: string | null;
    movement_date: string;
    reference_no: string | null;
    notes: string | null;
    created_at: Date;
    material: Material;
}
