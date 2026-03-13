import { ProcurementService } from './procurement.service';
export declare class ProcurementController {
    private readonly svc;
    constructor(svc: ProcurementService);
    findAll(project_id?: string, status?: string, supplier_id?: string): Promise<import("./entities/purchase-order.entity").PurchaseOrder[]>;
    getReceipts(purchase_order_id?: string): Promise<import("./entities/material-receipt.entity").MaterialReceipt[]>;
    findOne(id: string): Promise<{
        items: import("./entities/po-item.entity").PoItem[];
        receipts: import("./entities/material-receipt.entity").MaterialReceipt[];
        id: string;
        project_id: string;
        project_stage_id: string | null;
        supplier_id: string;
        order_date: string;
        expected_delivery: string | null;
        status: string;
        total_amount: string;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
    }>;
    create(dto: any): Promise<{
        items: import("./entities/po-item.entity").PoItem[];
        receipts: import("./entities/material-receipt.entity").MaterialReceipt[];
        id: string;
        project_id: string;
        project_stage_id: string | null;
        supplier_id: string;
        order_date: string;
        expected_delivery: string | null;
        status: string;
        total_amount: string;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
    }>;
    update(id: string, dto: any): Promise<{
        items: import("./entities/po-item.entity").PoItem[];
        receipts: import("./entities/material-receipt.entity").MaterialReceipt[];
        id: string;
        project_id: string;
        project_stage_id: string | null;
        supplier_id: string;
        order_date: string;
        expected_delivery: string | null;
        status: string;
        total_amount: string;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    createReceipt(id: string, dto: any): Promise<import("./entities/material-receipt.entity").MaterialReceipt>;
}
