import { CashflowService } from './cashflow.service';
export declare class CashflowController {
    private readonly svc;
    constructor(svc: CashflowService);
    findAll(project_id?: string, type?: string, from?: string, to?: string): Promise<import("./entities/cash-transaction.entity").CashTransaction[]>;
    create(dto: any): Promise<import("./entities/cash-transaction.entity").CashTransaction>;
    update(id: string, dto: any): Promise<import("./entities/cash-transaction.entity").CashTransaction | null>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    getSummary(from?: string, to?: string): Promise<{
        in: number;
        out: number;
        balance: number;
    }>;
    getDashboard(): Promise<{
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
