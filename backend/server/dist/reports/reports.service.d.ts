import { DataSource } from 'typeorm';
export declare class ReportsService {
    private readonly ds;
    constructor(ds: DataSource);
    private q;
    getBudgetVsActual(project_id?: string): Promise<any>;
    getStageBudgetVsActual(project_id: string): Promise<any>;
    getProjectProfitability(project_id?: string): Promise<any>;
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
    getReceivablesAging(): Promise<any>;
    getLabourCost(project_id?: string): Promise<{
        by_project: any;
        by_contractor: any;
    }>;
    getCashflowReport(period?: 'daily' | 'weekly' | 'monthly', from?: string, to?: string): Promise<any>;
    getExpenseBreakdown(project_id?: string): Promise<{
        by_category: any;
        by_vendor_type: any;
        by_month: any;
        grand_total: any;
    }>;
}
