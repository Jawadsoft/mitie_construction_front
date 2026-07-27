import { Repository } from 'typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PoItem } from './entities/po-item.entity';
import { MaterialReceipt } from './entities/material-receipt.entity';
import { InventoryService } from '../inventory/inventory.service';
export declare class ProcurementService {
    private readonly poRepo;
    private readonly itemRepo;
    private readonly receiptRepo;
    private readonly inventoryService;
    constructor(poRepo: Repository<PurchaseOrder>, itemRepo: Repository<PoItem>, receiptRepo: Repository<MaterialReceipt>, inventoryService: InventoryService);
    findAll(filters: {
        project_id?: string;
        status?: string;
        supplier_id?: string;
    }): Promise<PurchaseOrder[]>;
    findOne(id: string): Promise<{
        items: PoItem[];
        receipts: MaterialReceipt[];
        id: string;
        project_id: string;
        project_stage_id: string | null;
        supplier_id: string;
        material_request_id: string | null;
        created_by: string | null;
        order_date: string;
        expected_delivery: string | null;
        status: string;
        total_amount: string;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
    }>;
    create(dto: {
        order: Partial<PurchaseOrder>;
        items: Partial<PoItem>[];
    }): Promise<{
        items: PoItem[];
        receipts: MaterialReceipt[];
        id: string;
        project_id: string;
        project_stage_id: string | null;
        supplier_id: string;
        material_request_id: string | null;
        created_by: string | null;
        order_date: string;
        expected_delivery: string | null;
        status: string;
        total_amount: string;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
    }>;
    update(id: string, dto: Partial<PurchaseOrder>): Promise<{
        items: PoItem[];
        receipts: MaterialReceipt[];
        id: string;
        project_id: string;
        project_stage_id: string | null;
        supplier_id: string;
        material_request_id: string | null;
        created_by: string | null;
        order_date: string;
        expected_delivery: string | null;
        status: string;
        total_amount: string;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
    }>;
    createReceipt(purchase_order_id: string, dto: {
        receipt_date: string;
        notes?: string;
        items?: {
            material_id: string;
            quantity: string;
            unit_cost: string;
        }[];
    }): Promise<MaterialReceipt>;
    getReceipts(purchase_order_id?: string): Promise<MaterialReceipt[]>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
