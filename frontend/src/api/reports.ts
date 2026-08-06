import { getAuthHeaders, API_BASE } from './client';

const BASE = `${API_BASE}/api/reports`;
const h = () => ({ headers: getAuthHeaders() });

export interface BudgetVsActual {
  project_id: string; project_name: string;
  total_budget: number; total_spent: number; variance: number; utilization_pct: number;
}

export interface StageBudget {
  stage_id: string; stage_name: string; stage_budget: number;
  actual_cost: number; variance: number; utilization_pct: number; completion_percent: string;
}

export interface ProjectProfitability {
  project_id: string; project_name: string; status: string;
  total_budget: number; total_expenses: number; total_labour: number; total_cost: number;
  total_revenue: number; collected_revenue: number; pending_revenue: number;
  profit: number; profit_margin: number; total_units: number; sold_units: number;
}

export interface SoldUnitProfit {
  sale_id: string;
  sale_date: string;
  sale_status: string;
  project_id: string;
  project_name: string;
  unit_id: string;
  unit_number: string;
  unit_type: string | null;
  customer_name: string;
  sale_price: number;
  collected: number;
  balance: number;
  allocated_cost: number;
  profit: number;
  margin_pct: number;
}

export interface ProfitLoss {
  period: { from: string; to: string };
  revenue: { sales_passed: number; total: number };
  expenses: { by_category: { category: string; amount: number }[]; labour: number; total: number };
  gross_profit: number; gross_margin_pct: number; fund_in: number;
  sold_units: SoldUnitProfit[];
  sold_units_summary: {
    count: number;
    sale_price: number;
    collected: number;
    allocated_cost: number;
    profit: number;
    margin_pct: number;
  };
}

export interface SupplierPayable {
  supplier_id: string; supplier_name: string; phone: string;
  total_ordered: number; total_paid: number; balance_due: number;
}

export interface ReceivableRow {
  customer_id: string;
  customer_name: string;
  phone: string;
  sale_id: string;
  unit_number: string;
  project_id?: string;
  project_name?: string;
  total_due: number;
  total_paid: number;
  balance: number;
  overdue: number;
}

export interface LabourCost {
  by_project: { project_id: string; project_name: string; total_paid: number; contractor_count: number }[];
  by_contractor: { contractor_id: string; contractor_name: string; contractor_type: string; total_paid: number; total_days: number }[];
}

export interface CashflowRow {
  period: string; cash_in: number; cash_out: number; net: number; running_balance: number;
}

export interface ExpenseBreakdown {
  by_category: { category: string; total: number; count: number }[];
  by_vendor_type: { vendor_type: string; total: number }[];
  by_month: { month: string; total: number }[];
  grand_total: number;
}

export interface PartnersEquityReport {
  as_of: string | null;
  sharing: { mode: '50:50' | 'equal' | 'none'; share_pct: number; partner_count: number };
  owner_equity: number;
  net_income: number;
  total_capital: number;
  total_trailing_equity: number;
  partners: {
    bank_account_id: string;
    partner_name: string;
    bank_name: string | null;
    share_pct: number;
    capital_opening: number;
    capital_contributed: number;
    capital_in: number;
    profit_share: number;
    trailing_equity: number;
  }[];
}

const get = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, h());
  if (!res.ok) throw new Error('Report fetch failed');
  return res.json();
};

export const getBudgetVsActual = (project_id?: string) =>
  get<BudgetVsActual[]>(`${BASE}/budget-vs-actual${project_id ? `?project_id=${project_id}` : ''}`);

export const getStageBudget = (project_id: string) =>
  get<StageBudget[]>(`${BASE}/stage-budget/${project_id}`);

export const getProfitability = (project_id?: string) =>
  get<ProjectProfitability[]>(`${BASE}/profitability${project_id ? `?project_id=${project_id}` : ''}`);

export const getProfitLoss = (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  return get<ProfitLoss>(`${BASE}/profit-loss?${params}`);
};

export const getSupplierPayables = (project_id?: string) =>
  get<SupplierPayable[]>(
    `${BASE}/supplier-payables${project_id ? `?project_id=${project_id}` : ''}`,
  );
export const getReceivables = (project_id?: string) =>
  get<ReceivableRow[]>(
    `${BASE}/receivables${project_id ? `?project_id=${project_id}` : ''}`,
  );

export const getLabourCost = (project_id?: string) =>
  get<LabourCost>(`${BASE}/labour-cost${project_id ? `?project_id=${project_id}` : ''}`);

export const getCashflowReport = (period = 'monthly', from?: string, to?: string) => {
  const params = new URLSearchParams({ period });
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  return get<CashflowRow[]>(`${BASE}/cashflow?${params}`);
};

export const getExpenseBreakdown = (project_id?: string) =>
  get<ExpenseBreakdown>(`${BASE}/expenses${project_id ? `?project_id=${project_id}` : ''}`);

export const getPartnersEquity = (as_of?: string) =>
  get<PartnersEquityReport>(`${BASE}/partners-equity${as_of ? `?as_of=${as_of}` : ''}`);
