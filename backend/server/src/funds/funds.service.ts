import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { EntityManager, Repository, DataSource } from 'typeorm';
import { FundSource } from './entities/fund-source.entity';
import { FundTransaction } from './entities/fund-transaction.entity';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class FundsService implements OnModuleInit {
  private readonly logger = new Logger(FundsService.name);

  constructor(
    @InjectRepository(FundSource) private readonly sourcesRepo: Repository<FundSource>,
    @InjectRepository(FundTransaction) private readonly txRepo: Repository<FundTransaction>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly accounting: AccountingService,
  ) {}

  async onModuleInit() {
    try {
      await this.syncFundJournalDates();
    } catch (err) {
      this.logger.warn(`syncFundJournalDates on boot failed: ${err}`);
    }
  }

  /** Derive status from committed vs received. Cancelled is sticky until cleared. */
  computeStatus(committed: number | string, received: number | string, current?: string | null): string {
    if (current === 'Cancelled') return 'Cancelled';
    const c = Number(committed);
    const r = Number(received);
    if (r <= 0.009) return 'Committed';
    if (r + 0.009 >= c) return 'Fully_Received';
    return 'Partially_Received';
  }

  private async refreshSourceStatus(sourceId: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(FundSource) : this.sourcesRepo;
    const source = await repo.findOne({ where: { id: sourceId } });
    if (!source || source.status === 'Cancelled') return source;
    const status = this.computeStatus(source.total_committed, source.received_so_far, source.status);
    if (status !== source.status) {
      await repo.update(sourceId, { status });
      source.status = status;
    }
    return source;
  }

  async findSources(filters?: { project_id?: string; bank_account_id?: string; status?: string }) {
    let sql = `
      SELECT fs.*,
             COALESCE(SUM(ft.amount), 0) AS received_so_far,
             ba.name AS bank_account_name,
             ba.bank_name AS bank_name
      FROM fund_sources fs
      LEFT JOIN fund_transactions ft ON ft.fund_source_id = fs.id
      LEFT JOIN bank_accounts ba ON ba.id = fs.bank_account_id
    `;
    const params: string[] = [];
    const where: string[] = [];
    if (filters?.project_id) {
      params.push(filters.project_id);
      where.push(`fs.project_id = $${params.length}`);
    }
    if (filters?.bank_account_id) {
      params.push(filters.bank_account_id);
      where.push(`fs.bank_account_id = $${params.length}`);
    }
    if (filters?.status) {
      params.push(filters.status);
      where.push(`fs.status = $${params.length}`);
    }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' GROUP BY fs.id, ba.name, ba.bank_name ORDER BY fs.created_at DESC';
    return this.dataSource.query(sql, params);
  }

  async findOneSource(id: string) {
    const s = await this.sourcesRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Fund source not found');
    return s;
  }

  createSource(dto: Partial<FundSource>) {
    if (!dto.bank_account_id) {
      throw new BadRequestException('Partner bank (bank_account_id) is required');
    }
    const committed = dto.total_committed ?? '0';
    const received = dto.received_so_far ?? '0';
    const status =
      dto.status === 'Cancelled'
        ? 'Cancelled'
        : this.computeStatus(committed, received, null);
    return this.sourcesRepo.save(
      this.sourcesRepo.create({
        ...dto,
        project_id: dto.project_id || null,
        bank_account_id: dto.bank_account_id,
        status,
      }),
    );
  }

  async updateSource(id: string, dto: Partial<FundSource>) {
    return this.dataSource.transaction(async (manager) => {
      const sourcesRepo = manager.getRepository(FundSource);
      const txRepo = manager.getRepository(FundTransaction);
      const existing = await sourcesRepo.findOne({ where: { id } });
      if (!existing) throw new NotFoundException('Fund source not found');

      const next: Partial<FundSource> = {
        ...dto,
        project_id: dto.project_id !== undefined ? dto.project_id || null : undefined,
        bank_account_id: dto.bank_account_id !== undefined ? dto.bank_account_id || null : undefined,
        expected_date:
          dto.expected_date !== undefined
            ? dto.expected_date
              ? this.toDateOnly(dto.expected_date) || null
              : null
            : undefined,
      };

      if (dto.status === 'Cancelled') {
        next.status = 'Cancelled';
      } else if (dto.status != null && dto.status !== 'Cancelled') {
        const committed = dto.total_committed ?? existing.total_committed;
        const received = existing.received_so_far;
        next.status = this.computeStatus(committed, received, null);
      }

      await sourcesRepo.update(id, next as Partial<FundSource>);
      let updated = await sourcesRepo.findOne({ where: { id } });
      if (!updated) throw new NotFoundException('Fund source not found');

      if (updated.status !== 'Cancelled') {
        await this.refreshSourceStatus(id, manager);
        updated = await sourcesRepo.findOne({ where: { id } });
        if (!updated) throw new NotFoundException('Fund source not found');
      }

      // Rebuild FUND-* when bank/project/type/name change so GL matches the source
      const glAffecting =
        String(updated.bank_account_id ?? '') !== String(existing.bank_account_id ?? '') ||
        String(updated.project_id ?? '') !== String(existing.project_id ?? '') ||
        updated.source_type !== existing.source_type ||
        updated.source_name !== existing.source_name;
      if (glAffecting) {
        const txs = await txRepo.find({ where: { fund_source_id: id } });
        for (const ft of txs) {
          const transaction_date = this.toDateOnly(ft.transaction_date)!;
          await this.accounting.deleteJournalByReference(`FUND-${ft.id}`, manager);
          await this.accounting.postFundReceiptJournal(
            {
              fund_transaction_id: ft.id,
              fund_source_id: updated.id,
              source_name: updated.source_name,
              source_type: updated.source_type,
              bank_account_id: updated.bank_account_id,
              project_id: updated.project_id,
              transaction_date,
              amount: ft.amount,
            },
            manager,
          );
        }
      }

      return updated;
    });
  }

  /**
   * Align FUND-* journal entry_date with fund_transactions.transaction_date
   * (fixes older edits that updated the receipt but not the GL).
   */
  async syncFundJournalDates() {
    await this.dataSource.query(`
      UPDATE journal_entries je
      SET entry_date = ft.transaction_date
      FROM fund_transactions ft
      WHERE je.reference_no = ('FUND-' || ft.id::text)
        AND je.entry_date IS DISTINCT FROM ft.transaction_date
    `);
  }

  async findTransactions(fund_source_id?: string) {
    await this.syncFundJournalDates();
    const q = this.txRepo
      .createQueryBuilder('ft')
      .leftJoinAndSelect('ft.fund_source', 'fund_source')
      .orderBy('ft.transaction_date', 'DESC');
    if (fund_source_id) q.andWhere('ft.fund_source_id = :id', { id: fund_source_id });
    return q.getMany();
  }

  async createTransaction(dto: Partial<FundTransaction>) {
    if (!dto.fund_source_id || !dto.amount || !dto.transaction_date) {
      throw new BadRequestException('fund_source_id, amount, and transaction_date are required');
    }
    const transaction_date = this.toDateOnly(dto.transaction_date);
    if (!transaction_date) {
      throw new BadRequestException('transaction_date is invalid');
    }
    return this.dataSource.transaction(async (manager) => {
      const sourceRepo = manager.getRepository(FundSource);
      const txRepo = manager.getRepository(FundTransaction);
      const source = await sourceRepo.findOne({ where: { id: dto.fund_source_id } });
      if (!source) throw new NotFoundException('Fund source not found');
      if (source.status === 'Cancelled') {
        throw new BadRequestException('Cannot receive funds against a Cancelled commitment');
      }

      const tx = await txRepo.save(
        txRepo.create({ ...dto, transaction_date }),
      );
      await manager.query(
        `UPDATE fund_sources SET received_so_far = received_so_far + $1 WHERE id = $2`,
        [dto.amount, dto.fund_source_id],
      );

      await this.accounting.postFundReceiptJournal(
        {
          fund_transaction_id: tx.id,
          fund_source_id: source.id,
          source_name: source.source_name,
          source_type: source.source_type,
          bank_account_id: source.bank_account_id,
          project_id: source.project_id,
          transaction_date,
          amount: dto.amount!,
        },
        manager,
      );

      await this.refreshSourceStatus(source.id, manager);
      return tx;
    });
  }

  async deleteSource(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const sourcesRepo = manager.getRepository(FundSource);
      const txRepo = manager.getRepository(FundTransaction);
      const source = await sourcesRepo.findOne({ where: { id } });
      if (!source) throw new NotFoundException('Fund source not found');

      const txs = await txRepo.find({ where: { fund_source_id: id } });
      for (const ft of txs) {
        await this.accounting.deleteJournalByReference(`FUND-${ft.id}`, manager);
      }
      await txRepo.delete({ fund_source_id: id });
      await sourcesRepo.delete(id);
      return { deleted: true };
    });
  }

  private toDateOnly(value: string | Date | null | undefined): string | undefined {
    if (value == null || value === '') return undefined;
    const s = String(value).trim();
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : s.slice(0, 10);
  }

  async updateTransaction(id: string, dto: Partial<FundTransaction>) {
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(FundTransaction);
      const sourceRepo = manager.getRepository(FundSource);
      const old = await txRepo.findOne({ where: { id } });
      if (!old) throw new NotFoundException('Fund transaction not found');

      const transaction_date =
        dto.transaction_date !== undefined
          ? this.toDateOnly(dto.transaction_date)
          : undefined;
      if (dto.transaction_date !== undefined && !transaction_date) {
        throw new BadRequestException('transaction_date is invalid');
      }

      const nextSourceId =
        dto.fund_source_id !== undefined ? dto.fund_source_id : old.fund_source_id;
      const nextAmount =
        dto.amount !== undefined ? Number(dto.amount).toFixed(2) : old.amount;

      if (dto.fund_source_id !== undefined && dto.fund_source_id !== old.fund_source_id) {
        const dest = await sourceRepo.findOne({ where: { id: dto.fund_source_id } });
        if (!dest) throw new NotFoundException('Fund source not found');
        if (dest.status === 'Cancelled') {
          throw new BadRequestException('Cannot move receipt to a Cancelled commitment');
        }
      }

      await txRepo.update(id, {
        ...(dto.fund_source_id !== undefined ? { fund_source_id: dto.fund_source_id } : {}),
        ...(transaction_date !== undefined ? { transaction_date } : {}),
        ...(dto.amount !== undefined ? { amount: nextAmount } : {}),
        ...(dto.reference_no !== undefined ? { reference_no: dto.reference_no || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
      });

      // Adjust received balances if amount or source changed
      if (
        dto.amount !== undefined ||
        (dto.fund_source_id !== undefined && dto.fund_source_id !== old.fund_source_id)
      ) {
        await manager.query(
          `UPDATE fund_sources SET received_so_far = GREATEST(0, received_so_far - $1) WHERE id = $2`,
          [old.amount, old.fund_source_id],
        );
        await manager.query(
          `UPDATE fund_sources SET received_so_far = received_so_far + $1 WHERE id = $2`,
          [nextAmount, nextSourceId],
        );
        await this.refreshSourceStatus(old.fund_source_id, manager);
        if (nextSourceId !== old.fund_source_id) {
          await this.refreshSourceStatus(nextSourceId, manager);
        }
      }

      const updated = await txRepo.findOne({ where: { id } });
      if (!updated) throw new NotFoundException('Fund transaction not found');

      // Always rebuild FUND-* journal so GL date/amount/bank match the receipt
      const source = await sourceRepo.findOne({ where: { id: updated.fund_source_id } });
      if (!source) throw new NotFoundException('Fund source not found');
      await this.accounting.deleteJournalByReference(`FUND-${id}`, manager);
      await this.accounting.postFundReceiptJournal(
        {
          fund_transaction_id: updated.id,
          fund_source_id: source.id,
          source_name: source.source_name,
          source_type: source.source_type,
          bank_account_id: source.bank_account_id,
          project_id: source.project_id,
          transaction_date: this.toDateOnly(updated.transaction_date)!,
          amount: updated.amount,
        },
        manager,
      );

      return updated;
    });
  }

  async deleteTransaction(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(FundTransaction);
      const tx = await txRepo.findOne({ where: { id } });
      if (!tx) throw new NotFoundException('Fund transaction not found');
      await this.accounting.deleteJournalByReference(`FUND-${id}`, manager);
      await txRepo.delete(id);
      await manager.query(
        `UPDATE fund_sources SET received_so_far = GREATEST(0, received_so_far - $1) WHERE id = $2`,
        [tx.amount, tx.fund_source_id],
      );
      await this.refreshSourceStatus(tx.fund_source_id, manager);
      return { deleted: true };
    });
  }

  /** Investor / equity capital ledger — committed, received, remaining + receipts. */
  async getInvestorLedger() {
    const sources: Array<{
      id: string;
      source_name: string;
      source_type: string;
      status: string;
      total_committed: string;
      received_so_far: string;
      bank_account_id: string | null;
      bank_account_name: string | null;
      bank_name: string | null;
      project_id: string | null;
      project_name: string | null;
    }> = await this.dataSource.query(`
      SELECT fs.id::text AS id,
        fs.source_name,
        fs.source_type,
        fs.status,
        fs.total_committed::text AS total_committed,
        COALESCE(SUM(ft.amount), 0)::text AS received_so_far,
        fs.bank_account_id::text AS bank_account_id,
        ba.name AS bank_account_name,
        ba.bank_name AS bank_name,
        fs.project_id::text AS project_id,
        p.name AS project_name
      FROM fund_sources fs
      LEFT JOIN fund_transactions ft ON ft.fund_source_id = fs.id
      LEFT JOIN bank_accounts ba ON ba.id = fs.bank_account_id
      LEFT JOIN projects p ON p.id = fs.project_id
      WHERE fs.source_type IN ('INVESTOR', 'EQUITY')
        AND fs.status != 'Cancelled'
      GROUP BY fs.id, ba.name, ba.bank_name, p.name
      ORDER BY fs.source_name ASC
    `);

    const txs: Array<{
      id: string;
      fund_source_id: string;
      transaction_date: string;
      amount: string;
      reference_no: string | null;
      notes: string | null;
    }> = await this.dataSource.query(`
      SELECT ft.id::text AS id,
        ft.fund_source_id::text AS fund_source_id,
        ft.transaction_date::text AS transaction_date,
        ft.amount::text AS amount,
        ft.reference_no,
        ft.notes
      FROM fund_transactions ft
      JOIN fund_sources fs ON fs.id = ft.fund_source_id
      WHERE fs.source_type IN ('INVESTOR', 'EQUITY')
        AND fs.status != 'Cancelled'
      ORDER BY ft.transaction_date DESC, ft.id DESC
    `);

    const txBySource = new Map<string, typeof txs>();
    for (const t of txs) {
      const list = txBySource.get(t.fund_source_id) || [];
      list.push(t);
      txBySource.set(t.fund_source_id, list);
    }

    const entries = sources.map((s) => {
      const committed = Number(s.total_committed);
      const received = Number(s.received_so_far);
      return {
        id: s.id,
        source_name: s.source_name,
        source_type: s.source_type,
        status: s.status,
        committed,
        received,
        remaining: Math.max(0, committed - received),
        bank_account_id: s.bank_account_id,
        bank_label: [s.bank_name, s.bank_account_name].filter(Boolean).join(' — ') || null,
        project_id: s.project_id,
        project_name: s.project_name,
        transactions: (txBySource.get(s.id) || []).map((t) => ({
          id: t.id,
          transaction_date: t.transaction_date,
          amount: Number(t.amount),
          reference_no: t.reference_no,
          notes: t.notes,
        })),
      };
    });

    const total_committed = entries.reduce((s, e) => s + e.committed, 0);
    const total_received = entries.reduce((s, e) => s + e.received, 0);

    return {
      total_committed,
      total_received,
      available_capital: total_received,
      remaining_commitments: Math.max(0, total_committed - total_received),
      entries,
    };
  }
}
