import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly svc;
    constructor(svc: ReportsService);
    getBudgetVsActual(project_id?: string): Promise<any>;
    getStageBudget(project_id: string): Promise<any>;
    getProfitability(project_id?: string): Promise<any>;
    getProfitLoss(from?: string, to?: string): Promise<{
        period: {
            from: string;
            to: string;
        };
        revenue: {
            sales_collections: number;
            total: number;
        };
        expenses: {
            by_category: any;
            labour: number;
            total: any;
        };
        gross_profit: number;
        gross_margin_pct: number;
        fund_in: number;
    }>;
    getSupplierPayables(): Promise<any>;
    getReceivables(): Promise<any>;
    getLabourCost(project_id?: string): Promise<{
        by_project: any;
        by_contractor: any;
    }>;
    getCashflow(period?: 'daily' | 'weekly' | 'monthly', from?: string, to?: string): Promise<any>;
    getExpenses(project_id?: string): Promise<{
        by_category: any;
        by_vendor_type: any;
        by_month: any;
        grand_total: any;
    }>;
}
