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
            sales_passed: number;
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
        sold_units: any;
        sold_units_summary: {
            margin_pct: number;
            count: any;
            sale_price: any;
            collected: any;
            allocated_cost: any;
            profit: any;
        };
    }>;
    getSupplierPayables(): Promise<any>;
    getReceivablesAging(): Promise<any>;
    getLabourCost(project_id?: string): Promise<{
        by_project: any;
        by_contractor: any;
    }>;
    getCashflowReport(period?: 'daily' | 'weekly' | 'monthly', from?: string, to?: string): Promise<any>;
    getPartnersEquity(as_of?: string): Promise<{
        as_of: string | null;
        sharing: {
            mode: string;
            share_pct: number;
            partner_count: number;
        };
        owner_equity: number;
        net_income: number;
        total_capital: number;
        total_trailing_equity: number;
        partners: {
            share_pct: number;
            profit_share: number;
            trailing_equity: number;
            bank_account_id: string;
            partner_name: string;
            bank_name: string | null;
            capital_opening: number;
            capital_contributed: number;
            capital_in: number;
        }[];
    }>;
    getExpenseBreakdown(project_id?: string): Promise<{
        by_category: any;
        by_vendor_type: any;
        by_month: any;
        grand_total: any;
    }>;
}
