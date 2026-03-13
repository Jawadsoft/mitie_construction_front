import { Repository } from 'typeorm';
import { CashTransaction } from './entities/cash-transaction.entity';
import { DataSource } from 'typeorm';
export declare class CashflowService {
    private readonly repo;
    private readonly ds;
    constructor(repo: Repository<CashTransaction>, ds: DataSource);
    findAll(filters: {
        project_id?: string;
        type?: string;
        from?: string;
        to?: string;
    }): Promise<CashTransaction[]>;
    create(dto: Partial<CashTransaction>): Promise<CashTransaction>;
    update(id: string, dto: Partial<CashTransaction>): Promise<CashTransaction | null>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    getSummary(from?: string, to?: string): Promise<{
        in: number;
        out: number;
        balance: number;
    }>;
    getDashboardStats(): Promise<{
        cash_balance: number;
        cash_in: number;
        cash_out: number;
        active_projects: number;
        total_budget: number;
        total_expenses: number;
        total_labour: number;
        total_material_cost: number;
        total_cost: number;
        total_revenue: number;
        collected_revenue: number;
        pending_receivables: number;
        supplier_payables: number;
        total_units: number;
        sold_units: number;
        avg_stage_completion: number;
        stock_value: number;
        expected_profit: number;
    }>;
}
