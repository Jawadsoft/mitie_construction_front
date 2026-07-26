import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CashTransaction } from './entities/cash-transaction.entity';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class CashflowService {
  constructor(
    @InjectRepository(CashTransaction) private readonly repo: Repository<CashTransaction>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly accounting: AccountingService,
  ) {}

  /** Cash & Bank COA: account 1000 + its sub-accounts (partner banks). */
  private cashBankAccountFilter(alias = 'a') {
    return `(
      ${alias}.code = '1000'
      OR ${alias}.parent_account_id = (SELECT id FROM accounts WHERE code = '1000' LIMIT 1)
    )`;
  }

  /**
   * Live cash book from posted Cash & Bank journal lines,
   * plus orphan manual cash_transactions (not linked to a journal).
   */
  async findAll(filters: { project_id?: string; type?: string; from?: string; to?: string }) {
    const params: unknown[] = [];
    const journalWhere: string[] = [`je.status = 'Posted'`, this.cashBankAccountFilter('a')];
    const manualWhere: string[] = [`(t.related_entity_type IS NULL OR t.related_entity_type = '')`];

    if (filters.project_id) {
      params.push(filters.project_id);
      const p = `$${params.length}`;
      journalWhere.push(`je.project_id = ${p}`);
      manualWhere.push(`t.project_id = ${p}`);
    }
    if (filters.from) {
      params.push(filters.from);
      const p = `$${params.length}`;
      journalWhere.push(`je.entry_date >= ${p}`);
      manualWhere.push(`t.transaction_date >= ${p}`);
    }
    if (filters.to) {
      params.push(filters.to);
      const p = `$${params.length}`;
      journalWhere.push(`je.entry_date <= ${p}`);
      manualWhere.push(`t.transaction_date <= ${p}`);
    }

    let typeHaving = '';
    if (filters.type === 'IN' || filters.type === 'OUT') {
      params.push(filters.type);
      typeHaving = `WHERE x.type = $${params.length}`;
    }

    const rows = await this.ds.query(
      `
      SELECT * FROM (
        SELECT
          ('JE-' || l.id::text) AS id,
          TO_CHAR(je.entry_date::date, 'YYYY-MM-DD') AS transaction_date,
          CASE WHEN l.dr_cr = 'DEBIT' THEN 'IN' ELSE 'OUT' END AS type,
          CAST(l.amount AS NUMERIC)::text AS amount,
          CASE
            WHEN a.code = '1000' THEN 'Cash'
            ELSE COALESCE(NULLIF(a.name, ''), 'Bank Transfer')
          END AS method,
          je.reference_no AS reference_no,
          COALESCE(NULLIF(l.narration, ''), NULLIF(je.description, ''), a.name) AS description,
          je.project_id::text AS project_id,
          je.created_at AS created_at
        FROM journal_entry_lines l
        JOIN journal_entries je ON je.id = l.journal_entry_id
        JOIN accounts a ON a.id = l.account_id
        WHERE ${journalWhere.join(' AND ')}

        UNION ALL

        SELECT
          ('CT-' || t.id::text) AS id,
          TO_CHAR(t.transaction_date::date, 'YYYY-MM-DD') AS transaction_date,
          t.type::text AS type,
          CAST(t.amount AS NUMERIC)::text AS amount,
          t.method,
          t.reference_no,
          t.description,
          t.project_id::text AS project_id,
          t.created_at
        FROM cash_transactions t
        WHERE ${manualWhere.join(' AND ')}
      ) x
      ${typeHaving}
      ORDER BY x.transaction_date DESC, x.created_at DESC
      `,
      params,
    );

    return rows;
  }

  private async postCashJournal(
    tx: CashTransaction,
    manager?: EntityManager,
  ) {
    const cashId = await this.accounting.resolveBankAssetAccountId(null, manager);
    const offset =
      tx.type === 'IN'
        ? await this.accounting.findAccountByCode('4100', manager)
        : await this.accounting.findAccountByCode('5300', manager);
    const amt = Number(tx.amount).toFixed(2);
    const description = tx.description || (tx.type === 'IN' ? 'Cash inflow' : 'Cash outflow');
    return this.accounting.createAndPostEntry(
      {
        entry: {
          entry_date: tx.transaction_date,
          reference_no: `CASH-${tx.id}`,
          description,
          project_id: tx.project_id || null,
        },
        lines:
          tx.type === 'IN'
            ? [
                { account_id: cashId, dr_cr: 'DEBIT', amount: amt, narration: description },
                { account_id: offset.id, dr_cr: 'CREDIT', amount: amt, narration: description },
              ]
            : [
                { account_id: offset.id, dr_cr: 'DEBIT', amount: amt, narration: description },
                { account_id: cashId, dr_cr: 'CREDIT', amount: amt, narration: description },
              ],
      },
      manager,
    );
  }

  private async clearCashJournal(tx: CashTransaction, manager?: EntityManager) {
    await this.accounting.deleteJournalByReference(`CASH-${tx.id}`, manager);
    if (tx.related_entity_id) {
      await this.accounting.deleteJournalEntry(tx.related_entity_id, manager);
    }
  }

  async create(dto: Partial<CashTransaction>) {
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be greater than 0');
    }
    if (!dto.transaction_date) {
      throw new BadRequestException('transaction_date is required');
    }
    if (dto.type !== 'IN' && dto.type !== 'OUT') {
      throw new BadRequestException('type must be IN or OUT');
    }

    const amt = amount.toFixed(2);
    return this.ds.transaction(async (manager) => {
      const repo = manager.getRepository(CashTransaction);
      const tx = await repo.save(
        repo.create({
          ...dto,
          amount: amt,
          method: dto.method || 'Cash',
          related_entity_type: 'journal_entry',
          related_entity_id: null,
        }),
      );
      const je = await this.postCashJournal(tx, manager);
      await repo.update(tx.id, { related_entity_id: je.id });
      return repo.findOne({ where: { id: tx.id } });
    });
  }

  async update(id: string, dto: Partial<CashTransaction>) {
    return this.ds.transaction(async (manager) => {
      const repo = manager.getRepository(CashTransaction);
      const existing = await repo.findOne({ where: { id } });
      if (!existing) throw new BadRequestException('Cash transaction not found');

      const nextType = dto.type !== undefined ? dto.type : existing.type;
      if (nextType !== 'IN' && nextType !== 'OUT') {
        throw new BadRequestException('type must be IN or OUT');
      }
      const nextAmount =
        dto.amount !== undefined ? Number(dto.amount).toFixed(2) : existing.amount;
      if (!(Number(nextAmount) > 0)) {
        throw new BadRequestException('amount must be greater than 0');
      }

      await repo.update(id, {
        ...(dto.project_id !== undefined ? { project_id: dto.project_id || null } : {}),
        ...(dto.transaction_date !== undefined
          ? { transaction_date: dto.transaction_date }
          : {}),
        type: nextType,
        amount: nextAmount,
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.reference_no !== undefined ? { reference_no: dto.reference_no || null } : {}),
      });

      const updated = await repo.findOne({ where: { id } });
      if (!updated) throw new BadRequestException('Cash transaction not found');

      await this.clearCashJournal(existing, manager);
      const je = await this.postCashJournal(updated, manager);
      await repo.update(id, {
        related_entity_type: 'journal_entry',
        related_entity_id: je.id,
      });
      return repo.findOne({ where: { id } });
    });
  }

  async remove(id: string) {
    return this.ds.transaction(async (manager) => {
      const repo = manager.getRepository(CashTransaction);
      const tx = await repo.findOne({ where: { id } });
      if (!tx) throw new BadRequestException('Cash transaction not found');
      await this.clearCashJournal(tx, manager);
      await repo.delete(id);
      return { deleted: true };
    });
  }

  async getSummary(from?: string, to?: string) {
    const rows = await this.findAll({ from, to });
    let cashIn = 0;
    let cashOut = 0;
    for (const r of rows) {
      const amt = Number(r.amount);
      if (r.type === 'IN') cashIn += amt;
      else cashOut += amt;
    }
    return {
      in: Math.round(cashIn * 100) / 100,
      out: Math.round(cashOut * 100) / 100,
      balance: Math.round((cashIn - cashOut) * 100) / 100,
    };
  }

  async getDashboardStats() {
    const summary = await this.getSummary();

    const q = (sql: string) => this.ds.query(sql);

    const [[activeProjects], [totalBudget], [totalExpenses], [totalLabour],
           [totalRevenue], [collectedRevenue], [pendingReceivables],
           [supplierPayables], [totalUnits], [soldUnits], stageCompletion,
           [stockValue], [totalMaterials]] = await Promise.all([
      q(`SELECT COUNT(*) as count FROM projects WHERE status = 'Active'`),
      q(`SELECT COALESCE(SUM(CAST(total_estimated_budget AS NUMERIC)), 0) as total FROM projects`),
      q(`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM expenses`),
      q(`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM labour_payments`),
      q(`SELECT COALESCE(SUM(CAST(total_sale_price AS NUMERIC)), 0) as total FROM sales WHERE status != 'Cancelled'`),
      q(`SELECT COALESCE(SUM(CAST(total_paid AS NUMERIC)), 0) as total FROM sales WHERE status != 'Cancelled'`),
      // Receivables = outstanding sale balances (not collections; exclude cancelled)
      q(`
        SELECT COALESCE(SUM(
          CAST(total_sale_price AS NUMERIC) - CAST(total_paid AS NUMERIC)
        ), 0) AS total
        FROM sales
        WHERE status != 'Cancelled'
          AND CAST(total_sale_price AS NUMERIC) > CAST(total_paid AS NUMERIC)
      `),
      // Payables = unpaid / partial supplier (and other) bills
      q(`
        SELECT COALESCE(SUM(
          CAST(amount AS NUMERIC) - CAST(COALESCE(paid_amount, 0) AS NUMERIC)
        ), 0) AS total
        FROM expenses
        WHERE entry_mode = 'BILL'
          AND status IN ('Unpaid', 'Partial')
          AND vendor_type = 'SUPPLIER'
      `),
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
      pending_receivables: Number(pendingReceivables.total),
      supplier_payables: Number(supplierPayables.total),
      total_units: Number(totalUnits.count),
      sold_units: Number(soldUnits.count),
      avg_stage_completion: Number(stageCompletion.avg_completion),
      stock_value: Number(stockValue.total),
      expected_profit,
    };
  }
}
