import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashTransaction } from './entities/cash-transaction.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class CashflowService {
  constructor(
    @InjectRepository(CashTransaction) private readonly repo: Repository<CashTransaction>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  findAll(filters: { project_id?: string; type?: string; from?: string; to?: string }) {
    const q = this.repo.createQueryBuilder('t').orderBy('t.transaction_date', 'DESC');
    if (filters.project_id) q.andWhere('t.project_id = :pid', { pid: filters.project_id });
    if (filters.type) q.andWhere('t.type = :type', { type: filters.type });
    if (filters.from) q.andWhere('t.transaction_date >= :from', { from: filters.from });
    if (filters.to) q.andWhere('t.transaction_date <= :to', { to: filters.to });
    return q.getMany();
  }

  create(dto: Partial<CashTransaction>) { return this.repo.save(this.repo.create(dto)); }


  async update(id: string, dto: Partial<CashTransaction>) {
    await this.repo.update(id, dto);
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string) {
    await this.repo.delete(id);
    return { deleted: true };
  }
  async getSummary(from?: string, to?: string) {
    const q = this.repo.createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('SUM(CAST(t.amount AS NUMERIC))', 'total')
      .groupBy('t.type');
    if (from) q.andWhere('t.transaction_date >= :from', { from });
    if (to) q.andWhere('t.transaction_date <= :to', { to });
    const rows = await q.getRawMany();
    const inTotal = rows.find(r => r.type === 'IN')?.total || 0;
    const outTotal = rows.find(r => r.type === 'OUT')?.total || 0;
    return { in: Number(inTotal), out: Number(outTotal), balance: Number(inTotal) - Number(outTotal) };
  }

  async getDashboardStats() {
    const summary = await this.getSummary();

    const q = (sql: string) => this.ds.query(sql);

    const [[activeProjects], [totalBudget], [totalExpenses], [totalLabour],
           [totalRevenue], [collectedRevenue], [pendingInstallments],
           [supplierPayables], [totalUnits], [soldUnits], stageCompletion,
           [stockValue], [totalMaterials]] = await Promise.all([
      q(`SELECT COUNT(*) as count FROM projects WHERE status = 'Active'`),
      q(`SELECT COALESCE(SUM(CAST(total_estimated_budget AS NUMERIC)), 0) as total FROM projects`),
      q(`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM expenses`),
      q(`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM labour_payments WHERE 1=1`),
      q(`SELECT COALESCE(SUM(CAST(total_sale_price AS NUMERIC)), 0) as total FROM sales WHERE status != 'Cancelled'`),
      q(`SELECT COALESCE(SUM(CAST(total_paid AS NUMERIC)), 0) as total FROM sales WHERE status != 'Cancelled'`),
      q(`SELECT COALESCE(SUM(CAST(due_amount AS NUMERIC) - CAST(paid_amount AS NUMERIC)), 0) as total FROM sale_installments WHERE status != 'Paid'`),
      q(`SELECT COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0) as total FROM purchase_orders WHERE status != 'Cancelled'`),
      q(`SELECT COUNT(*) as count FROM property_units`),
      q(`SELECT COUNT(*) as count FROM property_units WHERE status = 'Sold'`),
      q(`SELECT COALESCE(AVG(CAST(completion_percent AS NUMERIC)), 0) as avg_completion FROM project_stages WHERE status = 'In Progress'`),
      q(`SELECT COALESCE(SUM(CASE WHEN movement_type IN ('RECEIPT','TRANSFER_IN','ADJUSTMENT','RETURN') THEN CAST(total_cost AS NUMERIC) WHEN movement_type IN ('ISSUE','TRANSFER_OUT') THEN -CAST(total_cost AS NUMERIC) ELSE 0 END), 0) as total FROM stock_ledger`),
      q(`SELECT COALESCE(SUM(CAST(total_cost AS NUMERIC)), 0) as total FROM material_issues`),
    ]);

    const total_cost = Number(totalExpenses.total) + Number(totalLabour.total) + Number(totalMaterials.total);
    const expected_profit = Number(totalRevenue.total) - total_cost;

    return {
      cash_balance: summary.balance,
      cash_in: summary.in,
      cash_out: summary.out,
      active_projects: Number(activeProjects.count),
      total_budget: Number(totalBudget.total),
      total_expenses: Number(totalExpenses.total),
      total_labour: Number(totalLabour.total),
      total_material_cost: Number(totalMaterials.total),
      total_cost,
      total_revenue: Number(totalRevenue.total),
      collected_revenue: Number(collectedRevenue.total),
      pending_receivables: Number(pendingInstallments.total),
      supplier_payables: Number(supplierPayables.total),
      total_units: Number(totalUnits.count),
      sold_units: Number(soldUnits.count),
      avg_stage_completion: Number(stageCompletion.avg_completion),
      stock_value: Number(stockValue.total),
      expected_profit,
    };
  }
}

