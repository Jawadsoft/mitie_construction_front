import { InventoryService } from './inventory.service';
export declare class InventoryController {
    private readonly svc;
    constructor(svc: InventoryService);
    findMaterials(category?: string): Promise<import("./entities/material.entity").Material[]>;
    getCategories(): Promise<any>;
    findOne(id: string): Promise<import("./entities/material.entity").Material>;
    createMaterial(dto: any): Promise<import("./entities/material.entity").Material>;
    updateMaterial(id: string, dto: any): Promise<import("./entities/material.entity").Material>;
    deleteMaterial(id: string): Promise<{
        deleted: boolean;
    }>;
    getStock(project_id?: string): Promise<any>;
    getLowStock(): Promise<any>;
    getLedger(material_id?: string, project_id?: string, movement_type?: string, from?: string, to?: string): Promise<import("./entities/stock-ledger.entity").StockLedger[]>;
    receiveStock(dto: any): Promise<import("./entities/stock-ledger.entity").StockLedger>;
    issueMaterial(dto: any): Promise<import("./entities/material-issue.entity").MaterialIssue>;
    getIssues(project_id?: string, project_stage_id?: string, material_id?: string): Promise<import("./entities/material-issue.entity").MaterialIssue[]>;
    adjustStock(dto: any): Promise<import("./entities/stock-ledger.entity").StockLedger>;
    getUtilization(project_id: string): Promise<{
        project_id: string;
        total_material_cost: any;
        by_material: any[];
    }>;
}
