import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { EntityManager, Repository, DataSource } from 'typeorm';
import { FundSource } from './entities/fund-source.entity';
import { FundTransaction } from './entities/fund-transaction.entity';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class FundsService {
  constructor(
    @InjectRepository(FundSource) private readonly sourcesRepo: Repository<FundSource>,
    @InjectRepository(FundTransaction) private readonly txRepo: Repository<FundTransaction>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly accounting: AccountingService,
  ) {}

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
    const existing = await this.findOneSource(id);
    const next: Partial<FundSource> = {
      ...dto,
      project_id: dto.project_id !== undefined ? dto.project_id || null : undefined,
      bank_account_id: dto.bank_account_id !== undefined ? dto.bank_account_id || null : undefined,
    };

    if (dto.status === 'Cancelled') {
      next.status = 'Cancelled';
    } else if (dto.status != null && dto.status !== 'Cancelled') {
      // Reactivate or explicit non-cancel → recompute from balances
      const committed = dto.total_committed ?? existing.total_committed;
      const received = existing.received_so_far;
      next.status = this.computeStatus(committed, received, null);
    }

    await this.sourcesRepo.update(id, next as Partial<FundSource>);
    const updated = await this.findOneSource(id);
    if (updated.status !== 'Cancelled') {
      await this.refreshSourceStatus(id);
      return this.findOneSource(id);
    }
    return updated;
  }

  findTransactions(fund_source_id?: string) {
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
    return this.dataSource.transaction(async (manager) => {
      const sourceRepo = manager.getRepository(FundSource);
      const txRepo = manager.getRepository(FundTransaction);
      const source = await sourceRepo.findOne({ where: { id: dto.fund_source_id } });
      if (!source) throw new NotFoundException('Fund source not found');
      if (source.status === 'Cancelled') {
        throw new BadRequestException('Cannot receive funds against a Cancelled commitment');
      }

      const tx = await txRepo.save(txRepo.create(dto));
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
          transaction_date: dto.transaction_date!,
          amount: dto.amount!,
        },
        manager,
      );

      await this.refreshSourceStatus(source.id, manager);
      return tx;
    });
  }

  async deleteSource(id: string) {
    await this.sourcesRepo.delete(id);
    return { deleted: true };
  }

  async updateTransaction(id: string, dto: Partial<FundTransaction>) {
    const old = await this.txRepo.findOne({ where: { id } });
    await this.txRepo.update(id, dto);
    if (old && dto.amount !== undefined) {
      const diff = Number(dto.amount) - Number(old.amount);
      if (diff !== 0) {
        await this.dataSource.query(
          `UPDATE fund_sources SET received_so_far = received_so_far + $1 WHERE id = $2`,
          [diff, old.fund_source_id],
        );
      }
      await this.refreshSourceStatus(old.fund_source_id);
    }
    return this.txRepo.findOne({ where: { id } });
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
}
