import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private q(sql: string, params: any[] = []) {
    return this.ds.query(sql, params);
  }

  // ─── Budget vs Actual per Project ────────────────────────────────────────
  async getBudgetVsActual(project_id?: string) {
    const whereProj = project_id ? `WHERE p.id = $1` : '';
    const rows = await this.q(`
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        COALESCE(p.total_estimated_budget, 0) AS total_budget,
        (
          COALESCE((SELECT SUM(CAST(e.amount AS NUMERIC)) FROM expenses e WHERE e.project_id = p.id), 0)
          + COALESCE((SELECT SUM(CAST(lp.amount AS NUMERIC)) FROM labour_payments lp WHERE lp.project_id = p.id), 0)
          + COALESCE((SELECT SUM(CAST(mi.total_cost AS NUMERIC)) FROM material_issues mi WHERE mi.project_id = p.id), 0)
        ) AS total_spent
      FROM projects p
      ${whereProj}
      ORDER BY p.name
    `, project_id ? [project_id] : []);
    return rows.map((r: any) => {
      const total_budget = Number(r.total_budget);
      const total_spent = Number(r.total_spent);
      return {
        ...r,
        total_budget,
        total_spent,
        variance: total_budget - total_spent,
        utilization_pct: total_budget > 0 ? Math.round((total_spent / total_budget) * 100) : 0,
      };
    });
  }

  // ─── Budget vs Actual per Stage ──────────────────────────────────────────
  async getStageBudgetVsActual(project_id: string) {
    const rows = await this.q(`
      SELECT
        ps.id AS stage_id,
        ps.name AS stage_name,
        COALESCE(sb.labour_budget,0)+COALESCE(sb.material_budget,0)+COALESCE(sb.equipment_budget,0)+COALESCE(sb.other_budget,0) AS stage_budget,
        (
          COALESCE((SELECT SUM(CAST(e.amount AS NUMERIC)) FROM expenses e WHERE e.project_stage_id = ps.id), 0)
          + COALESCE((SELECT SUM(CAST(lp.amount AS NUMERIC)) FROM labour_payments lp WHERE lp.project_stage_id = ps.id), 0)
          + COALESCE((SELECT SUM(CAST(mi.total_cost AS NUMERIC)) FROM material_issues mi WHERE mi.project_stage_id = ps.id), 0)
        ) AS actual_cost,
        ps.completion_percent
      FROM project_stages ps
      LEFT JOIN stage_budgets sb ON sb.project_stage_id = ps.id
      WHERE ps.project_id = $1
      ORDER BY ps.sequence_order
    `, [project_id]);
    return rows.map((r: any) => ({
      ...r,
      stage_budget: Number(r.stage_budget),
      actual_cost: Number(r.actual_cost),
      variance: Number(r.stage_budget) - Number(r.actual_cost),
      utilization_pct: Number(r.stage_budget) > 0
        ? Math.round((Number(r.actual_cost) / Number(r.stage_budget)) * 100) : 0,
    }));
  }

  // ─── Project Profitability ────────────────────────────────────────────────
  async getProjectProfitability(project_id?: string) {
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
    return rows.map((r: any) => {
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

  // ─── P&L Statement ───────────────────────────────────────────────────────
  async getProfitLoss(
    from?: string,
    to?: string,
    project_id?: string,
    include_unsold = true,
  ) {
    const dateFilter = (col: string) => {
      const parts: string[] = [];
      if (from) parts.push(`${col} >= '${from}'`);
      if (to) parts.push(`${col} <= '${to}'`);
      return parts.length ? `AND ${parts.join(' AND ')}` : '';
    };
    const projectParams = project_id ? [project_id] : [];
    const saleProjectFilter = project_id ? 'AND pu.project_id = $1' : '';
    const expenseProjectFilter = project_id ? 'AND e.project_id = $1' : '';
    const labourProjectFilter = project_id ? 'AND lp.project_id = $1' : '';
    const soldProjectFilter = project_id ? 'AND p.id = $1' : '';
    const soldProjectCostsFilter = project_id ? 'WHERE p.id = $1' : '';
    const soldProjectsOnlyExpenseFilter = include_unsold
      ? ''
      : `AND EXISTS (
          SELECT 1
          FROM sales sx
          JOIN property_units pux ON pux.id = sx.property_unit_id
          WHERE pux.project_id = e.project_id AND sx.status != 'Cancelled'
        )`;
    const soldProjectsOnlyLabourFilter = include_unsold
      ? ''
      : `AND EXISTS (
          SELECT 1
          FROM sales sx
          JOIN property_units pux ON pux.id = sx.property_unit_id
          WHERE pux.project_id = lp.project_id AND sx.status != 'Cancelled'
        )`;

    // Revenue = recognized / passed sales (sale price), not installment collections
    const [revenue] = await this.q(`
      SELECT COALESCE(SUM(CAST(s.total_sale_price AS NUMERIC)), 0) AS total
      FROM sales s
      JOIN property_units pu ON pu.id = s.property_unit_id
      WHERE s.status != 'Cancelled'
        ${saleProjectFilter}
        ${dateFilter('s.sale_date')}
    `, projectParams);

    const expenses_by_cat = await this.q(`
      SELECT e.category, SUM(CAST(e.amount AS NUMERIC)) AS total
      FROM expenses e
      WHERE 1=1
        ${expenseProjectFilter}
        ${soldProjectsOnlyExpenseFilter}
        ${dateFilter('e.expense_date')}
      GROUP BY e.category ORDER BY total DESC
    `, projectParams);

    const [labour_total] = await this.q(`
      SELECT COALESCE(SUM(CAST(lp.amount AS NUMERIC)), 0) AS total
      FROM labour_payments lp
      WHERE 1=1
        ${labourProjectFilter}
        ${soldProjectsOnlyLabourFilter}
        ${dateFilter('lp.payment_date')}
    `, projectParams);

    const [fund_in] = await this.q(`
      SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) AS total
      FROM fund_transactions
      WHERE 1=1 ${dateFilter('transaction_date')}
    `);

    // Sold-unit profitability: sale price − allocated project cost share
    // Cost share = project (expenses + labour + materials) allocated by area_sqft when
    // every unit has area; otherwise equal share across all project units.
    const sold_unit_rows = await this.q(`
      WITH project_costs AS (
        SELECT
          p.id AS project_id,
          COALESCE((SELECT SUM(CAST(e.amount AS NUMERIC)) FROM expenses e WHERE e.project_id = p.id), 0)
            + COALESCE((SELECT SUM(CAST(lp.amount AS NUMERIC)) FROM labour_payments lp WHERE lp.project_id = p.id), 0)
            + COALESCE((SELECT SUM(CAST(mi.total_cost AS NUMERIC)) FROM material_issues mi WHERE mi.project_id = p.id), 0)
            AS total_cost,
          (SELECT COUNT(*)::numeric FROM property_units pu0 WHERE pu0.project_id = p.id) AS unit_count,
          (SELECT COUNT(*)::numeric FROM property_units pu1
            WHERE pu1.project_id = p.id AND pu1.area_sqft IS NOT NULL AND CAST(pu1.area_sqft AS NUMERIC) > 0) AS units_with_area,
          (SELECT COALESCE(SUM(CAST(pu2.area_sqft AS NUMERIC)), 0) FROM property_units pu2
            WHERE pu2.project_id = p.id AND pu2.area_sqft IS NOT NULL AND CAST(pu2.area_sqft AS NUMERIC) > 0) AS total_area
        FROM projects p
        ${soldProjectCostsFilter}
      )
      SELECT
        s.id::text AS sale_id,
        s.sale_date::text AS sale_date,
        s.status AS sale_status,
        p.id::text AS project_id,
        p.name AS project_name,
        pu.id::text AS unit_id,
        pu.unit_number,
        pu.unit_type,
        c.name AS customer_name,
        CAST(s.total_sale_price AS NUMERIC) AS sale_price,
        CAST(s.total_paid AS NUMERIC) AS collected,
        CAST(s.total_sale_price AS NUMERIC) - CAST(s.total_paid AS NUMERIC) AS balance,
        CASE
          WHEN pc.unit_count > 0
            AND pc.units_with_area = pc.unit_count
            AND pc.total_area > 0
            AND pu.area_sqft IS NOT NULL
            AND CAST(pu.area_sqft AS NUMERIC) > 0
          THEN ROUND(pc.total_cost * (CAST(pu.area_sqft AS NUMERIC) / pc.total_area), 2)
          WHEN pc.unit_count > 0
          THEN ROUND(pc.total_cost / pc.unit_count, 2)
          ELSE 0
        END AS allocated_cost
      FROM sales s
      JOIN property_units pu ON pu.id = s.property_unit_id
      JOIN projects p ON p.id = pu.project_id
      JOIN customers c ON c.id = s.customer_id
      LEFT JOIN project_costs pc ON pc.project_id = p.id
      WHERE s.status != 'Cancelled'
        ${soldProjectFilter}
        ${dateFilter('s.sale_date')}
      ORDER BY s.sale_date DESC, s.id DESC
    `, projectParams);

    const sold_units = sold_unit_rows.map((r: any) => {
      const sale_price = Number(r.sale_price);
      const allocated_cost = Number(r.allocated_cost);
      const profit = Math.round((sale_price - allocated_cost) * 100) / 100;
      const margin_pct = sale_price > 0 ? Math.round((profit / sale_price) * 100) : 0;
      return {
        sale_id: r.sale_id,
        sale_date: r.sale_date,
        sale_status: r.sale_status,
        project_id: r.project_id,
        project_name: r.project_name,
        unit_id: r.unit_id,
        unit_number: r.unit_number,
        unit_type: r.unit_type,
        customer_name: r.customer_name,
        sale_price,
        collected: Number(r.collected),
        balance: Number(r.balance),
        allocated_cost,
        profit,
        margin_pct,
      };
    });

    const sold_units_summary = {
      count: sold_units.length,
      sale_price: sold_units.reduce((s, u) => s + u.sale_price, 0),
      collected: sold_units.reduce((s, u) => s + u.collected, 0),
      allocated_cost: sold_units.reduce((s, u) => s + u.allocated_cost, 0),
      profit: sold_units.reduce((s, u) => s + u.profit, 0),
    };
    sold_units_summary.profit = Math.round(sold_units_summary.profit * 100) / 100;
    sold_units_summary.allocated_cost = Math.round(sold_units_summary.allocated_cost * 100) / 100;

    const total_expenses = expenses_by_cat.reduce((s: number, r: any) => s + Number(r.total), 0);
    const total_labour = Number(labour_total.total);
    const total_revenue = Number(revenue.total);
    const gross_profit = total_revenue - total_expenses - total_labour;

    return {
      period: { from: from ?? 'All time', to: to ?? 'All time' },
      scope: {
        project_id: project_id ?? null,
        include_unsold,
      },
      revenue: {
        sales_passed: total_revenue,
        total: total_revenue,
      },
      expenses: {
        by_category: expenses_by_cat.map((r: any) => ({ category: r.category, amount: Number(r.total) })),
        labour: total_labour,
        total: total_expenses + total_labour,
      },
      gross_profit,
      gross_margin_pct: total_revenue > 0 ? Math.round((gross_profit / total_revenue) * 100) : 0,
      fund_in: Number(fund_in.total),
      sold_units,
      sold_units_summary: {
        ...sold_units_summary,
        margin_pct:
          sold_units_summary.sale_price > 0
            ? Math.round((sold_units_summary.profit / sold_units_summary.sale_price) * 100)
            : 0,
      },
    };
  }

  // ─── Payables (outstanding project bills) ─────────────────────────────────
  async getSupplierPayables(project_id?: string) {
    // All unpaid/partial BILL expenses across vendor types (supplier, labour, other),
    // not only supplier-linked rows — so project pending payments show up.
    const params = project_id ? [project_id] : [];
    const expenseProjectFilter = project_id ? ' AND e.project_id = $1' : '';

    const rows = await this.q(
      `
      SELECT
        e.id::text AS expense_id,
        e.project_id::text AS project_id,
        COALESCE(p.name, 'Overhead') AS project_name,
        e.vendor_type,
        CASE
          WHEN e.vendor_type = 'SUPPLIER' AND s.id IS NOT NULL THEN s.id::text
          WHEN e.vendor_type = 'LABOUR' AND lc.id IS NOT NULL THEN lc.id::text
          ELSE NULL
        END AS party_id,
        CASE
          WHEN e.vendor_type = 'SUPPLIER' AND s.name IS NOT NULL THEN s.name
          WHEN e.vendor_type = 'LABOUR' AND lc.name IS NOT NULL THEN lc.name
          WHEN e.description IS NOT NULL AND btrim(e.description) <> '' THEN e.description
          ELSE 'Unassigned'
        END AS party_name,
        COALESCE(s.phone, lc.phone) AS phone,
        e.category,
        e.expense_date::text AS expense_date,
        e.due_date::text AS due_date,
        e.status,
        CAST(e.amount AS NUMERIC) AS amount,
        CAST(COALESCE(e.paid_amount, 0) AS NUMERIC) AS paid_amount,
        CAST(e.amount AS NUMERIC) - CAST(COALESCE(e.paid_amount, 0) AS NUMERIC) AS balance_due
      FROM expenses e
      LEFT JOIN projects p ON p.id = e.project_id
      LEFT JOIN suppliers s ON s.id = e.supplier_id
      LEFT JOIN labour_contractors lc ON lc.id = e.contractor_id
      WHERE e.entry_mode = 'BILL'
        AND e.status IN ('Unpaid', 'Partial')
        AND (CAST(e.amount AS NUMERIC) - CAST(COALESCE(e.paid_amount, 0) AS NUMERIC)) > 0.009
        ${expenseProjectFilter}
      ORDER BY
        COALESCE(e.due_date, e.expense_date) ASC,
        e.id ASC
    `,
      params,
    );

    return rows.map((r: any) => ({
      expense_id: r.expense_id,
      project_id: r.project_id,
      project_name: r.project_name,
      vendor_type: r.vendor_type,
      party_id: r.party_id,
      party_name: r.party_name,
      // Keep legacy keys for older clients/exports
      supplier_id: r.party_id,
      supplier_name: r.party_name,
      phone: r.phone,
      category: r.category,
      expense_date: r.expense_date,
      due_date: r.due_date,
      status: r.status,
      amount: Number(r.amount),
      paid_amount: Number(r.paid_amount),
      balance_due: Number(r.balance_due),
      total_ordered: Number(r.amount),
      total_paid: Number(r.paid_amount),
    }));
  }

  // ─── Customer Receivables ─────────────────────────────────────────────────
  async getReceivablesAging(project_id?: string) {
    const today = new Date().toISOString().split('T')[0];
    const params: string[] = [];
    let projectClause = '';
    if (project_id) {
      params.push(project_id);
      projectClause = ` AND pu.project_id = $1`;
    }
    const rows = await this.q(
      `
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        s.id AS sale_id,
        pu.unit_number,
        pu.project_id,
        p.name AS project_name,
        CAST(s.total_sale_price AS NUMERIC) AS total_due,
        CAST(s.total_paid AS NUMERIC) AS total_paid,
        CAST(s.total_sale_price AS NUMERIC) - CAST(s.total_paid AS NUMERIC) AS balance,
        COALESCE((
          SELECT SUM(CAST(si.due_amount AS NUMERIC) - CAST(si.paid_amount AS NUMERIC))
          FROM sale_installments si
          WHERE si.sale_id = s.id
            AND si.status != 'Paid'
            AND si.due_date < '${today}'
        ), 0) AS overdue
      FROM customers c
      JOIN sales s ON s.customer_id = c.id AND s.status != 'Cancelled'
      JOIN property_units pu ON pu.id = s.property_unit_id
      JOIN projects p ON p.id = pu.project_id
      WHERE CAST(s.total_sale_price AS NUMERIC) > CAST(s.total_paid AS NUMERIC)
      ${projectClause}
      ORDER BY overdue DESC, balance DESC
    `,
      params,
    );
    return rows.map((r: any) => ({
      ...r,
      total_due: Number(r.total_due),
      total_paid: Number(r.total_paid),
      balance: Number(r.balance),
      overdue: Number(r.overdue),
    }));
  }

  // ─── Labour Cost by Project/Stage ────────────────────────────────────────
  async getLabourCost(project_id?: string) {
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

    const byContractor = await this.q(`
      SELECT
        lc.id AS contractor_id, lc.name AS contractor_name, lc.contractor_type,
        COALESCE(SUM(CAST(lp.amount AS NUMERIC)), 0) AS total_paid,
        COALESCE(SUM(CAST(la.present_days AS NUMERIC)), 0) AS total_days
      FROM labour_contractors lc
      LEFT JOIN labour_payments lp
        ON lp.contractor_id = lc.id${project_id ? ' AND lp.project_id = $1' : ''}
      LEFT JOIN labour_attendance la
        ON la.contractor_id = lc.id${project_id ? ' AND la.project_id = $1' : ''}
      GROUP BY lc.id, lc.name, lc.contractor_type
      ORDER BY total_paid DESC
    `, project_id ? [project_id] : []);

    return {
      by_project: byProject.map((r: any) => ({ ...r, total_paid: Number(r.total_paid) })),
      by_contractor: byContractor.map((r: any) => ({
        ...r, total_paid: Number(r.total_paid), total_days: Number(r.total_days),
      })),
    };
  }

  // ─── Cashflow Report (grouped by period) ─────────────────────────────────
  async getCashflowReport(
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    from?: string,
    to?: string,
    project_id?: string,
  ) {
    // Actual cash is derived from posted Cash & Bank journal lines.
    // Forecast cash uses outstanding installment/bill balances by their due dates.
    const groupBy = period === 'daily'
      ? `je.entry_date::date`
      : period === 'weekly'
      ? `TO_CHAR(DATE_TRUNC('week', je.entry_date::date), 'IYYY-IW')`
      : `TO_CHAR(je.entry_date, 'YYYY-MM')`;

    const label = period === 'daily'
      ? `je.entry_date::date`
      : period === 'weekly'
      ? `TO_CHAR(DATE_TRUNC('week', je.entry_date::date), 'IYYY"-W"IW')`
      : `TO_CHAR(je.entry_date, 'YYYY-MM')`;

    const actualParams: string[] = [];
    const dateWhere: string[] = [
      `je.status = 'Posted'`,
      `(a.code = '1000' OR a.parent_account_id = (SELECT id FROM accounts WHERE code = '1000' LIMIT 1))`,
      `NOT EXISTS (
        SELECT 1
        FROM journal_entry_lines transfer_line
        JOIN accounts transfer_account ON transfer_account.id = transfer_line.account_id
        WHERE transfer_line.journal_entry_id = je.id
          AND transfer_line.id != l.id
          AND (
            transfer_account.code = '1000'
            OR transfer_account.parent_account_id = (
              SELECT id FROM accounts WHERE code = '1000' LIMIT 1
            )
          )
      )`,
    ];
    if (from) {
      actualParams.push(from);
      dateWhere.push(`je.entry_date >= $${actualParams.length}`);
    }
    if (to) {
      actualParams.push(to);
      dateWhere.push(`je.entry_date <= $${actualParams.length}`);
    }
    if (project_id) {
      actualParams.push(project_id);
      dateWhere.push(`je.project_id = $${actualParams.length}`);
    }
    const whereClause = `WHERE ${dateWhere.join(' AND ')}`;

    const rows = await this.q(`
      SELECT
        ${label} AS period,
        SUM(CASE WHEN l.dr_cr = 'DEBIT' THEN CAST(l.amount AS NUMERIC) ELSE 0 END) AS cash_in,
        SUM(CASE WHEN l.dr_cr = 'CREDIT' THEN CAST(l.amount AS NUMERIC) ELSE 0 END) AS cash_out
      FROM journal_entry_lines l
      JOIN journal_entries je ON je.id = l.journal_entry_id
      JOIN accounts a ON a.id = l.account_id
      ${whereClause}
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `, actualParams);

    let openingCash = 0;
    if (from) {
      const openingParams: string[] = [from];
      const openingWhere = [
        `je.status = 'Posted'`,
        `(a.code = '1000' OR a.parent_account_id = (SELECT id FROM accounts WHERE code = '1000' LIMIT 1))`,
        `je.entry_date < $1`,
        `NOT EXISTS (
          SELECT 1
          FROM journal_entry_lines transfer_line
          JOIN accounts transfer_account ON transfer_account.id = transfer_line.account_id
          WHERE transfer_line.journal_entry_id = je.id
            AND transfer_line.id != l.id
            AND (
              transfer_account.code = '1000'
              OR transfer_account.parent_account_id = (
                SELECT id FROM accounts WHERE code = '1000' LIMIT 1
              )
            )
        )`,
      ];
      if (project_id) {
        openingParams.push(project_id);
        openingWhere.push(`je.project_id = $${openingParams.length}`);
      }
      const [opening] = await this.q(
        `
        SELECT COALESCE(SUM(
          CASE WHEN l.dr_cr = 'DEBIT'
            THEN CAST(l.amount AS NUMERIC)
            ELSE -CAST(l.amount AS NUMERIC)
          END
        ), 0) AS total
        FROM journal_entry_lines l
        JOIN journal_entries je ON je.id = l.journal_entry_id
        JOIN accounts a ON a.id = l.account_id
        WHERE ${openingWhere.join(' AND ')}
        `,
        openingParams,
      );
      openingCash = Number(opening?.total ?? 0);
    }

    let runningBalance = openingCash;
    const actualRows = rows.map((r: any) => {
      runningBalance += Number(r.cash_in) - Number(r.cash_out);
      return {
        period: r.period,
        cash_in: Number(r.cash_in),
        cash_out: Number(r.cash_out),
        net: Number(r.cash_in) - Number(r.cash_out),
        running_balance: runningBalance,
      };
    });

    // Classify each cash movement by its contra (non-cash) account so the
    // statement can be presented as Operating / Investing / Financing.
    const activityParams: string[] = [];
    const activityWhere: string[] = [
      `je.status = 'Posted'`,
      `ca.code <> '1000'`,
      `ca.parent_account_id IS DISTINCT FROM (SELECT id FROM accounts WHERE code = '1000' LIMIT 1)`,
      `EXISTS (
        SELECT 1
        FROM journal_entry_lines cash_line
        JOIN accounts cash_account ON cash_account.id = cash_line.account_id
        WHERE cash_line.journal_entry_id = je.id
          AND (
            cash_account.code = '1000'
            OR cash_account.parent_account_id = (
              SELECT id FROM accounts WHERE code = '1000' LIMIT 1
            )
          )
      )`,
    ];
    if (from) {
      activityParams.push(from);
      activityWhere.push(`je.entry_date >= $${activityParams.length}`);
    }
    if (to) {
      activityParams.push(to);
      activityWhere.push(`je.entry_date <= $${activityParams.length}`);
    }
    if (project_id) {
      activityParams.push(project_id);
      activityWhere.push(`je.project_id = $${activityParams.length}`);
    }

    // A non-cash CREDIT line is a source of cash (inflow);
    // a non-cash DEBIT line is a use of cash (outflow).
    const activityRows = await this.q(
      `
      SELECT
        ca.code AS account_code,
        ca.name AS account_name,
        ca.type AS account_type,
        COALESCE(SUM(CASE WHEN cl.dr_cr = 'CREDIT' THEN CAST(cl.amount AS NUMERIC) ELSE 0 END), 0) AS inflow,
        COALESCE(SUM(CASE WHEN cl.dr_cr = 'DEBIT' THEN CAST(cl.amount AS NUMERIC) ELSE 0 END), 0) AS outflow
      FROM journal_entry_lines cl
      JOIN journal_entries je ON je.id = cl.journal_entry_id
      JOIN accounts ca ON ca.id = cl.account_id
      WHERE ${activityWhere.join(' AND ')}
      GROUP BY ca.code, ca.name, ca.type
      ORDER BY ca.code
      `,
      activityParams,
    );

    const classifyActivity = (
      code: string,
    ): 'operating' | 'investing' | 'financing' => {
      if (code.startsWith('15')) return 'investing';
      if (code.startsWith('21') || code.startsWith('30')) return 'financing';
      return 'operating';
    };

    type ActivityLine = {
      account_code: string;
      account_name: string;
      account_type: string;
      inflow: number;
      outflow: number;
      net: number;
    };
    const activities: Record<
      'operating' | 'investing' | 'financing',
      { lines: ActivityLine[]; inflow: number; outflow: number; net: number }
    > = {
      operating: { lines: [], inflow: 0, outflow: 0, net: 0 },
      investing: { lines: [], inflow: 0, outflow: 0, net: 0 },
      financing: { lines: [], inflow: 0, outflow: 0, net: 0 },
    };
    for (const row of activityRows) {
      const inflow = Number(row.inflow);
      const outflow = Number(row.outflow);
      if (inflow <= 0.009 && outflow <= 0.009) continue;
      const bucket = activities[classifyActivity(String(row.account_code))];
      bucket.lines.push({
        account_code: row.account_code,
        account_name: row.account_name,
        account_type: row.account_type,
        inflow,
        outflow,
        net: inflow - outflow,
      });
      bucket.inflow += inflow;
      bucket.outflow += outflow;
      bucket.net += inflow - outflow;
    }

    const dueParams: string[] = [];
    const receivableWhere = [
      `s.status != 'Cancelled'`,
      `si.status != 'Paid'`,
      `(CAST(si.due_amount AS NUMERIC) - CAST(COALESCE(si.paid_amount, 0) AS NUMERIC)) > 0.009`,
    ];
    const payableWhere = [
      `e.entry_mode = 'BILL'`,
      `e.status IN ('Unpaid', 'Partial')`,
      `e.due_date IS NOT NULL`,
      `(CAST(e.amount AS NUMERIC) - CAST(COALESCE(e.paid_amount, 0) AS NUMERIC)) > 0.009`,
    ];
    if (from) {
      dueParams.push(from);
      const p = `$${dueParams.length}`;
      receivableWhere.push(`si.due_date >= ${p}`);
      payableWhere.push(`e.due_date >= ${p}`);
    }
    if (to) {
      dueParams.push(to);
      const p = `$${dueParams.length}`;
      receivableWhere.push(`si.due_date <= ${p}`);
      payableWhere.push(`e.due_date <= ${p}`);
    }
    if (project_id) {
      dueParams.push(project_id);
      const p = `$${dueParams.length}`;
      receivableWhere.push(`pu.project_id = ${p}`);
      payableWhere.push(`e.project_id = ${p}`);
    }

    const dueReceivableRows = await this.q(
      `
      SELECT
        si.id::text AS installment_id,
        s.id::text AS sale_id,
        pu.project_id::text AS project_id,
        p.name AS project_name,
        c.name AS party_name,
        pu.unit_number,
        si.due_date::text AS due_date,
        CAST(si.due_amount AS NUMERIC) - CAST(COALESCE(si.paid_amount, 0) AS NUMERIC) AS amount
      FROM sale_installments si
      JOIN sales s ON s.id = si.sale_id
      JOIN property_units pu ON pu.id = s.property_unit_id
      JOIN projects p ON p.id = pu.project_id
      JOIN customers c ON c.id = s.customer_id
      WHERE ${receivableWhere.join(' AND ')}
      ORDER BY si.due_date ASC, si.id ASC
      `,
      dueParams,
    );

    const duePayableRows = await this.q(
      `
      SELECT
        e.id::text AS expense_id,
        e.project_id::text AS project_id,
        COALESCE(p.name, 'Overhead') AS project_name,
        CASE
          WHEN e.vendor_type = 'SUPPLIER' AND s.name IS NOT NULL THEN s.name
          WHEN e.vendor_type = 'LABOUR' AND lc.name IS NOT NULL THEN lc.name
          WHEN e.description IS NOT NULL AND btrim(e.description) <> '' THEN e.description
          ELSE 'Unassigned'
        END AS party_name,
        e.category,
        e.due_date::text AS due_date,
        CAST(e.amount AS NUMERIC) - CAST(COALESCE(e.paid_amount, 0) AS NUMERIC) AS amount
      FROM expenses e
      LEFT JOIN projects p ON p.id = e.project_id
      LEFT JOIN suppliers s ON s.id = e.supplier_id
      LEFT JOIN labour_contractors lc ON lc.id = e.contractor_id
      WHERE ${payableWhere.join(' AND ')}
      ORDER BY e.due_date ASC, e.id ASC
      `,
      dueParams,
    );

    const dueReceivables = dueReceivableRows.map((r: any) => ({
      ...r,
      amount: Number(r.amount),
    }));
    const duePayables = duePayableRows.map((r: any) => ({
      ...r,
      amount: Number(r.amount),
    }));
    const actualCashIn = actualRows.reduce((sum, r) => sum + r.cash_in, 0);
    const actualCashOut = actualRows.reduce((sum, r) => sum + r.cash_out, 0);
    const actualNet = actualCashIn - actualCashOut;
    const actualClosingCash = openingCash + actualNet;
    const expectedReceivables = dueReceivables.reduce((sum, r) => sum + r.amount, 0);
    const expectedPayables = duePayables.reduce((sum, r) => sum + r.amount, 0);

    // Cash locked in active / in-progress projects that have not started sales yet
    const lockedParams: string[] = [];
    const lockedWhere = [
      `p.deleted_at IS NULL`,
      `p.status IN ('Planning', 'Active', 'On Hold')`,
      `NOT EXISTS (
         SELECT 1 FROM sales s
         JOIN property_units pu ON pu.id = s.property_unit_id
         WHERE pu.project_id = p.id AND s.status != 'Cancelled'
       )`,
    ];
    if (project_id) {
      lockedParams.push(project_id);
      lockedWhere.push(`p.id = $${lockedParams.length}`);
    }
    const lockedProjectRows = await this.q(
      `
      SELECT
        p.id::text AS project_id,
        p.name AS project_name,
        p.status,
        COALESCE((SELECT SUM(CAST(COALESCE(e.paid_amount, 0) AS NUMERIC)) FROM expenses e WHERE e.project_id = p.id), 0)
          + COALESCE((SELECT SUM(CAST(lp.amount AS NUMERIC)) FROM labour_payments lp WHERE lp.project_id = p.id), 0)
          AS invested
      FROM projects p
      WHERE ${lockedWhere.join(' AND ')}
      ORDER BY p.name ASC
      `,
      lockedParams,
    );
    const locked_in_projects = lockedProjectRows
      .map((r: any) => ({
        project_id: r.project_id,
        project_name: r.project_name,
        status: r.status,
        invested: Number(r.invested),
      }))
      .filter((r: { invested: number }) => r.invested > 0.009);
    const locked_in_projects_total = locked_in_projects.reduce(
      (s: number, r: { invested: number }) => s + r.invested,
      0,
    );
    const expected_net =
      expectedReceivables - expectedPayables - locked_in_projects_total;
    const expected_closing_cash = actualClosingCash + expected_net;

    return {
      scope: {
        project_id: project_id ?? null,
        from: from ?? null,
        to: to ?? null,
        period,
      },
      summary: {
        opening_cash: openingCash,
        actual_cash_in: actualCashIn,
        actual_cash_out: actualCashOut,
        actual_net: actualNet,
        actual_closing_cash: actualClosingCash,
        due_receivables: expectedReceivables,
        due_payables: expectedPayables,
        locked_in_projects: Math.round(locked_in_projects_total * 100) / 100,
        expected_net: Math.round(expected_net * 100) / 100,
        expected_closing_cash: Math.round(expected_closing_cash * 100) / 100,
        operating_net: activities.operating.net,
        investing_net: activities.investing.net,
        financing_net: activities.financing.net,
      },
      activities,
      rows: actualRows,
      due_receivables: dueReceivables,
      due_payables: duePayables,
      locked_in_projects,
    };
  }

  /**
   * Trailing partners equity — capital in per partner bank + shared P&L.
   * Only banks with remaining capital (opening and/or equity receipts) are partners.
   * Deleted fund sources/receipts are excluded. Empty/duplicate banks with 0 capital are hidden.
   * Sharing: 50:50 when exactly two capitalised partners remain.
   */
  async getPartnersEquity(as_of?: string) {
    const banks: Array<{
      id: string;
      name: string;
      bank_name: string | null;
      opening_balance: string;
    }> = await this.q(`
      SELECT id::text AS id, name, bank_name, opening_balance::text
      FROM bank_accounts
      WHERE is_active = true
      ORDER BY name ASC, id ASC
    `);

    // Net income from posted journals (same plug as balance sheet)
    const dateClause = as_of ? `AND je.entry_date <= $1` : '';
    const plParams = as_of ? [as_of] : [];
    const [pl] = await this.q(
      `
      SELECT
        COALESCE(SUM(CASE WHEN a.type = 'INCOME' AND l.dr_cr = 'CREDIT' THEN CAST(l.amount AS NUMERIC)
                          WHEN a.type = 'INCOME' AND l.dr_cr = 'DEBIT' THEN -CAST(l.amount AS NUMERIC)
                          ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN a.type = 'EXPENSE' AND l.dr_cr = 'DEBIT' THEN CAST(l.amount AS NUMERIC)
                          WHEN a.type = 'EXPENSE' AND l.dr_cr = 'CREDIT' THEN -CAST(l.amount AS NUMERIC)
                          ELSE 0 END), 0) AS expense
      FROM journal_entry_lines l
      JOIN journal_entries je ON je.id = l.journal_entry_id
      JOIN accounts a ON a.id = l.account_id
      WHERE je.status = 'Posted' ${dateClause}
    `,
      plParams,
    );
    const net_income = Number(pl?.income ?? 0) - Number(pl?.expense ?? 0);

    const [equityBal] = await this.q(
      `
      SELECT COALESCE(SUM(
        CASE WHEN l.dr_cr = 'CREDIT' THEN CAST(l.amount AS NUMERIC)
             ELSE -CAST(l.amount AS NUMERIC) END
      ), 0) AS balance
      FROM journal_entry_lines l
      JOIN journal_entries je ON je.id = l.journal_entry_id
      JOIN accounts a ON a.id = l.account_id
      WHERE je.status = 'Posted' AND a.code = '3000' ${dateClause}
    `,
      plParams,
    );
    const owner_equity = Number(equityBal?.balance ?? 0);

    type PartnerRow = {
      bank_account_id: string;
      partner_name: string;
      bank_name: string | null;
      share_pct: number;
      capital_opening: number;
      capital_contributed: number;
      capital_in: number;
      profit_share: number;
      trailing_equity: number;
    };

    const capitalised: PartnerRow[] = [];
    for (const b of banks) {
      // Equity receipts still on file (deleted sources/txs are gone from DB)
      const capParams: unknown[] = [b.id];
      let receiptDate = '';
      if (as_of) {
        capParams.push(as_of);
        receiptDate = `AND ft.transaction_date <= $${capParams.length}`;
      }
      const [cap] = await this.q(
        `
        SELECT COALESCE(SUM(CAST(ft.amount AS NUMERIC)), 0) AS total
        FROM fund_transactions ft
        JOIN fund_sources fs ON fs.id = ft.fund_source_id
        WHERE fs.bank_account_id = $1
          AND fs.source_type = 'EQUITY'
          AND fs.status != 'Cancelled'
          ${receiptDate}
      `,
        capParams,
      );

      // Opening capital only if BANK-OPEN journal still exists (cleared openings don't count)
      const [openJe] = await this.q(
        `
        SELECT COALESCE(SUM(CAST(l.amount AS NUMERIC)), 0) AS total
        FROM journal_entries je
        JOIN journal_entry_lines l ON l.journal_entry_id = je.id AND l.dr_cr = 'DEBIT'
        WHERE je.reference_no = $1 AND je.status = 'Posted'
      `,
        [`BANK-OPEN-${b.id}`],
      );

      const capital_opening = Number(openJe?.total ?? 0);
      const capital_contributed = Number(cap?.total ?? 0);
      const capital_in = Math.round((capital_opening + capital_contributed) * 100) / 100;

      // Hide banks with no remaining equity capital (deleted equity / empty duplicates)
      if (capital_in <= 0.009) continue;

      capitalised.push({
        bank_account_id: b.id,
        partner_name: b.name,
        bank_name: b.bank_name,
        share_pct: 0,
        capital_opening,
        capital_contributed,
        capital_in,
        profit_share: 0,
        trailing_equity: 0,
      });
    }

    const partnerCount = capitalised.length;
    const share_pct =
      partnerCount === 2 ? 50 : partnerCount > 0 ? Math.round(10000 / partnerCount) / 100 : 0;

    const partners = capitalised.map((p) => {
      const profit_share = Math.round(net_income * (share_pct / 100) * 100) / 100;
      return {
        ...p,
        share_pct,
        profit_share,
        trailing_equity: Math.round((p.capital_in + profit_share) * 100) / 100,
      };
    });

    const total_capital = partners.reduce((s, p) => s + p.capital_in, 0);
    const total_trailing = partners.reduce((s, p) => s + p.trailing_equity, 0);

    return {
      as_of: as_of ?? null,
      sharing: {
        mode: partnerCount === 2 ? '50:50' : partnerCount > 0 ? 'equal' : 'none',
        share_pct,
        partner_count: partnerCount,
      },
      owner_equity,
      net_income: Math.round(net_income * 100) / 100,
      total_capital: Math.round(total_capital * 100) / 100,
      total_trailing_equity: Math.round(total_trailing * 100) / 100,
      partners,
    };
  }

  // ─── Expense Breakdown ────────────────────────────────────────────────────
  async getExpenseBreakdown(project_id?: string) {
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
      by_category: byCategory.map((r: any) => ({ ...r, total: Number(r.total) })),
      by_vendor_type: byVendorType.map((r: any) => ({ ...r, total: Number(r.total) })),
      by_month: byMonth.map((r: any) => ({ ...r, total: Number(r.total) })),
      grand_total: byCategory.reduce((s: number, r: any) => s + Number(r.total), 0),
    };
  }
}
