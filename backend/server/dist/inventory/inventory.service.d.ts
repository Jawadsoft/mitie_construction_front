import { OnModuleInit } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Material } from './entities/material.entity';
import { StockLedger } from './entities/stock-ledger.entity';
import { MaterialIssue } from './entities/material-issue.entity';
export declare class InventoryService implements OnModuleInit {
    private readonly materialRepo;
    private readonly ledgerRepo;
    private readonly issueRepo;
    private readonly ds;
    constructor(materialRepo: Repository<Material>, ledgerRepo: Repository<StockLedger>, issueRepo: Repository<MaterialIssue>, ds: DataSource);
    onModuleInit(): Promise<void>;
    findAllMaterials(category?: string): Promise<Material[]>;
    findOneMaterial(id: string): Promise<Material>;
    createMaterial(dto: Partial<Material>): Promise<Material>;
    updateMaterial(id: string, dto: Partial<Material>): Promise<Material>;
    getStockSummary(project_id?: string): Promise<any>;
    getStockByMaterial(material_id: string): Promise<{
        ledger: StockLedger[];
        summary: any;
    }>;
    receiveStock(dto: {
        material_id: string;
        quantity: string;
        unit_cost: string;
        movement_date: string;
        project_id?: string | null;
        purchase_order_id?: string | null;
        reference_no?: string;
        notes?: string;
    }): Promise<StockLedger>;
    issueMaterial(dto: {
        material_id: string;
        project_id: string;
        project_stage_id?: string | null;
        quantity: string;
        unit_cost?: string;
        issue_date: string;
        purpose?: string;
        reference_no?: string;
        notes?: string;
    }): Promise<MaterialIssue>;
    adjustStock(dto: {
        material_id: string;
        quantity: string;
        movement_type: 'ADJUSTMENT' | 'RETURN';
        movement_date: string;
        unit_cost?: string;
        notes?: string;
    }): Promise<StockLedger>;
    getLedger(filters: {
        material_id?: string;
        project_id?: string;
        movement_type?: string;
        from?: string;
        to?: string;
    }): Promise<StockLedger[]>;
    getIssues(filters: {
        project_id?: string;
        project_stage_id?: string;
        material_id?: string;
    }): Promise<MaterialIssue[]>;
    getProjectUtilization(project_id: string): Promise<{
        project_id: string;
        total_material_cost: any;
        by_material: any[];
    }>;
    getLowStockAlerts(): Promise<any>;
    getCategories(): Promise<any>;
    deleteMaterial(id: string): Promise<{
        deleted: boolean;
    }>;
}
