"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let ReportsService = class ReportsService {
    ds;
    constructor(ds) {
        this.ds = ds;
    }
    q(sql, params = []) {
        return this.ds.query(sql, params);
    }
    async getBudgetVsActual(project_id) {
        const whereProj = project_id ? `WHERE p.id = $1` : '';
        const rows = await this.q(`
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        COALESCE(p.total_estimated_budget, 0) AS total_budget,
        COALESCE(SUM(CAST(e.amount AS NUMERIC)), 0) AS total_spent,
        COALESCE(p.total_estimated_budget, 0) - COALESCE(SUM(CAST(e.amount AS NUMERIC)), 0) AS variance
      FROM projects p
      LEFT JOIN expenses e ON e.project_id = p.id
      ${whereProj}
      GROUP BY p.id, p.name, p.total_estimated_budget
      ORDER BY p.name
    `, project_id ? [project_id] : []);
        return rows.map((r) => ({
            ...r,
            total_budget: Number(r.total_budget),
            total_spent: Number(r.total_spent),
            variance: Number(r.variance),
            utilization_pct: r.total_budget > 0 ? Math.round((Number(r.total_spent) / Number(r.total_budget)) * 100) : 0,
        }));
    }
    async getStageBudgetVsActual(project_id) {
        const rows = await this.q(`
      SELECT
        ps.id AS stage_id,
        ps.name AS stage_name,
        COALESCE(sb.labour_budget,0)+COALESCE(sb.material_budget,0)+COALESCE(sb.equipment_budget,0)+COALESCE(sb.other_budget,0) AS stage_budget,
        COALESCE(SUM(CAST(e.amount AS NUMERIC)), 0) AS actual_cost,
        ps.completion_percent
      FROM project_stages ps
      LEFT JOIN stage_budgets sb ON sb.project_stage_id = ps.id
      LEFT JOIN expenses e ON e.project_stage_id = ps.id
      WHERE ps.project_id = $1
      GROUP BY ps.id, ps.name,
        COALESCE(sb.labour_budget,0)+COALESCE(sb.material_budget,0)+COALESCE(sb.equipment_budget,0)+COALESCE(sb.other_budget,0),
        ps.completion_percent
      ORDER BY ps.sequence_order
    `, [project_id]);
        return rows.map((r) => ({
            ...r,
            stage_budget: Number(r.stage_budget),
            actual_cost: Number(r.actual_cost),
            variance: Number(r.stage_budget) - Number(r.actual_cost),
            utilization_pct: Number(r.stage_budget) > 0
                ? Math.round((Number(r.actual_cost) / Number(r.stage_budget)) * 100) : 0,
        }));
    }
    async getProjectProfitability(project_id) {
        const whereProj = project_id ? `WHERE p.id = $1` : '';
        const rows = await this.q(`
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        p.status,
        COALESCE(p.total_estimated_budget, 0) AS total_budget,
        COALESCE((SELECT SUM(CAST(e.amount AS NUMERIC)) FROM expenses e WHERE e.project_id = p.id), 0) AS total_expenses,
        COALESCE((SELECT SUM(CAST(lp.amount AS NUMERIC)) FROM labour_payments lp WHERE lp.project_id = p.id), 0) AS total_labour,
        COALESCE((SELECT SUM(CAST(mi.total_cost AS NUMERIC)) FROM material_issues mi WHERE mi.project_id = p.id), 0) AS total_materials,
        COALESCE((SELECT SUM(CAST(s2.total_sale_price AS NUMERIC)) FROM sales s2
          JOIN property_units pu ON pu.id = s2.property_unit_id
          WHERE pu.project_id = p.id AND s2.status != 'Cancelled'), 0) AS total_revenue,
        COALESCE((SELECT SUM(CAST(s2.total_paid AS NUMERIC)) FROM sales s2
          JOIN property_units pu ON pu.id = s2.property_unit_id
          WHERE pu.project_id = p.id AND s2.status != 'Cancelled'), 0) AS collected_revenue,
        (SELECT COUNT(*) FROM property_units pu2 WHERE pu2.project_id = p.id) AS total_units,
        (SELECT COUNT(*) FROM property_units pu2 WHERE pu2.project_id = p.id AND pu2.status = 'Sold') AS sold_units
      FROM projects p
      ${whereProj}
      ORDER BY p.name
    `, project_id ? [project_id] : []);
        return rows.map((r) => {
            const total_cost = Number(r.total_expenses) + Number(r.total_labour) + Number(r.total_materials ?? 0);
            const profit = Number(r.total_revenue) - total_cost;
            const profit_margin = r.total_revenue > 0 ? Math.round((profit / Number(r.total_revenue)) * 100) : 0;
            return {
                ...r,
                total_budget: Number(r.total_budget),
                total_expenses: Number(r.total_expenses),
                total_materials: Number(r.total_materials ?? 0),
                total_labour: Number(r.total_labour),
                total_cost,
                total_revenue: Number(r.total_revenue),
                collected_revenue: Number(r.collected_revenue),
                pending_revenue: Number(r.total_revenue) - Number(r.collected_revenue),
                profit,
                profit_margin,
                total_units: Number(r.total_units),
                sold_units: Number(r.sold_units),
            };
        });
    }
    async getProfitLoss(from, to) {
        const dateFilter = (col) => {
            const parts = [];
            if (from)
                parts.push(`${col} >= '${from}'`);
            if (to)
                parts.push(`${col} <= '${to}'`);
            return parts.length ? `AND ${parts.join(' AND ')}` : '';
        };
        const [revenue] = await this.q(`
      SELECT COALESCE(SUM(CAST(i.paid_amount AS NUMERIC)), 0) AS total
      FROM sale_installments i
      WHERE i.status IN ('Paid','Partial') ${dateFilter('i.paid_date')}
    `);
        const expenses_by_cat = await this.q(`
      SELECT category, SUM(CAST(amount AS NUMERIC)) AS total
      FROM expenses
      WHERE 1=1 ${dateFilter('expense_date')}
      GROUP BY category ORDER BY total DESC
    `);
        const [labour_total] = await this.q(`
      SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) AS total
      FROM labour_payments
      WHERE 1=1 ${dateFilter('payment_date')}
    `);
        const [fund_in] = await this.q(`
      SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) AS total
      FROM fund_transactions
      WHERE 1=1 ${dateFilter('transaction_date')}
    `);
        const total_expenses = expenses_by_cat.reduce((s, r) => s + Number(r.total), 0);
        const total_labour = Number(labour_total.total);
        const total_revenue = Number(revenue.total);
        const gross_profit = total_revenue - total_expenses - total_labour;
        return {
            period: { from: from ?? 'All time', to: to ?? 'All time' },
            revenue: {
                sales_collections: total_revenue,
                total: total_revenue,
            },
            expenses: {
                by_category: expenses_by_cat.map((r) => ({ category: r.category, amount: Number(r.total) })),
                labour: total_labour,
                total: total_expenses + total_labour,
            },
            gross_profit,
            gross_margin_pct: total_revenue > 0 ? Math.round((gross_profit / total_revenue) * 100) : 0,
            fund_in: Number(fund_in.total),
        };
    }
    async getSupplierPayables() {
        const rows = await this.q(`
      SELECT
        s.id AS supplier_id,
        s.name AS supplier_name,
        s.phone,
        COALESCE(SUM(CAST(po.total_amount AS NUMERIC)), 0) AS total_ordered,
        COALESCE(SUM(CAST(e.amount AS NUMERIC)), 0) AS total_paid,
        COALESCE(SUM(CAST(po.total_amount AS NUMERIC)), 0) -
          COALESCE(SUM(CAST(e.amount AS NUMERIC)), 0) AS balance_due
      FROM suppliers s
      LEFT JOIN purchase_orders po ON po.supplier_id = s.id AND po.status != 'Cancelled'
      LEFT JOIN expenses e ON e.supplier_id = s.id AND e.vendor_type = 'SUPPLIER'
      WHERE s.is_active = true
      GROUP BY s.id, s.name, s.phone
      ORDER BY balance_due DESC
    `);
        return rows.map((r) => ({
            ...r,
            total_ordered: Number(r.total_ordered),
            total_paid: Number(r.total_paid),
            balance_due: Number(r.balance_due),
        }));
    }
    async getReceivablesAging() {
        const today = new Date().toISOString().split('T')[0];
        const rows = await this.q(`
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        s.id AS sale_id,
        pu.unit_number,
        COALESCE(SUM(CAST(si.due_amount AS NUMERIC)),0) AS total_due,
        COALESCE(SUM(CAST(si.paid_amount AS NUMERIC)),0) AS total_paid,
        COALESCE(SUM(CAST(si.due_amount AS NUMERIC)),0) -
          COALESCE(SUM(CAST(si.paid_amount AS NUMERIC)),0) AS balance,
        COALESCE(SUM(CASE WHEN si.due_date < '${today}' AND si.status NOT IN ('Paid')
          THEN CAST(si.due_amount AS NUMERIC) - CAST(si.paid_amount AS NUMERIC) ELSE 0 END),0) AS overdue
      FROM customers c
      JOIN sales s ON s.customer_id = c.id AND s.status != 'Cancelled'
      JOIN property_units pu ON pu.id = s.property_unit_id
      LEFT JOIN sale_installments si ON si.sale_id = s.id AND si.status != 'Paid'
      GROUP BY c.id, c.name, c.phone, s.id, pu.unit_number
      ORDER BY overdue DESC, balance DESC
    `);
        return rows.map((r) => ({
            ...r,
            total_due: Number(r.total_due),
            total_paid: Number(r.total_paid),
            balance: Number(r.balance),
            overdue: Number(r.overdue),
        }));
    }
    async getLabourCost(project_id) {
        const byProject = await this.q(`
      SELECT
        p.id AS project_id, p.name AS project_name,
        COALESCE(SUM(CAST(lp.amount AS NUMERIC)), 0) AS total_paid,
        COUNT(DISTINCT lp.contractor_id) AS contractor_count
      FROM projects p
      LEFT JOIN labour_payments lp ON lp.project_id = p.id
      ${project_id ? `WHERE p.id = $1` : ''}
      GROUP BY p.id, p.name ORDER BY total_paid DESC
    `, project_id ? [project_id] : []);
        const labourWhere = project_id ? `AND project_id = $1` : '';
        const byContractor = await this.q(`
      SELECT
        lc.id AS contractor_id, lc.name AS contractor_name, lc.contractor_type,
        COALESCE(SUM(CAST(lp.amount AS NUMERIC)), 0) AS total_paid,
        COALESCE(SUM(CAST(la.present_days AS NUMERIC)), 0) AS total_days
      FROM labour_contractors lc
      LEFT JOIN labour_payments lp ON lp.contractor_id = lc.id ${labourWhere}
      LEFT JOIN labour_attendance la ON la.contractor_id = lc.id ${labourWhere}
      GROUP BY lc.id, lc.name, lc.contractor_type ORDER BY total_paid DESC
    `, project_id ? [project_id] : []);
        return {
            by_project: byProject.map((r) => ({ ...r, total_paid: Number(r.total_paid) })),
            by_contractor: byContractor.map((r) => ({
                ...r, total_paid: Number(r.total_paid), total_days: Number(r.total_days),
            })),
        };
    }
    async getCashflowReport(period = 'monthly', from, to) {
        const groupBy = period === 'daily'
            ? `transaction_date::date`
            : period === 'weekly'
                ? `TO_CHAR(DATE_TRUNC('week', transaction_date::date), 'IYYY-IW')`
                : `TO_CHAR(transaction_date, 'YYYY-MM')`;
        const label = period === 'daily'
            ? `transaction_date::date`
            : period === 'weekly'
                ? `TO_CHAR(DATE_TRUNC('week', transaction_date::date), 'IYYY"-W"IW')`
                : `TO_CHAR(transaction_date, 'YYYY-MM')`;
        const dateWhere = [];
        if (from)
            dateWhere.push(`transaction_date >= '${from}'`);
        if (to)
            dateWhere.push(`transaction_date <= '${to}'`);
        const whereClause = dateWhere.length ? `WHERE ${dateWhere.join(' AND ')}` : '';
        const rows = await this.q(`
      SELECT
        ${label} AS period,
        SUM(CASE WHEN type='IN' THEN CAST(amount AS NUMERIC) ELSE 0 END) AS cash_in,
        SUM(CASE WHEN type='OUT' THEN CAST(amount AS NUMERIC) ELSE 0 END) AS cash_out
      FROM cash_transactions
      ${whereClause}
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `);
        let runningBalance = 0;
        return rows.map((r) => {
            runningBalance += Number(r.cash_in) - Number(r.cash_out);
            return {
                period: r.period,
                cash_in: Number(r.cash_in),
                cash_out: Number(r.cash_out),
                net: Number(r.cash_in) - Number(r.cash_out),
                running_balance: runningBalance,
            };
        });
    }
    async getExpenseBreakdown(project_id) {
        const whereProj = project_id ? `WHERE e.project_id = $1` : '';
        const params = project_id ? [project_id] : [];
        const byCategory = await this.q(`
      SELECT category, SUM(CAST(amount AS NUMERIC)) AS total, COUNT(*) AS count
      FROM expenses e ${whereProj}
      GROUP BY category ORDER BY total DESC
    `, params);
        const byVendorType = await this.q(`
      SELECT vendor_type, SUM(CAST(amount AS NUMERIC)) AS total
      FROM expenses e ${whereProj}
      GROUP BY vendor_type ORDER BY total DESC
    `, params);
        const byMonth = await this.q(`
      SELECT TO_CHAR(expense_date, 'YYYY-MM') AS month,
        SUM(CAST(amount AS NUMERIC)) AS total
      FROM expenses e ${whereProj}
      GROUP BY TO_CHAR(expense_date, 'YYYY-MM')
      ORDER BY month
    `, params);
        return {
            by_category: byCategory.map((r) => ({ ...r, total: Number(r.total) })),
            by_vendor_type: byVendorType.map((r) => ({ ...r, total: Number(r.total) })),
            by_month: byMonth.map((r) => ({ ...r, total: Number(r.total) })),
            grand_total: byCategory.reduce((s, r) => s + Number(r.total), 0),
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], ReportsService);
//# sourceMappingURL=reports.service.js.map