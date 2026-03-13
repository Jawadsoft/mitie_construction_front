import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FundSource } from './entities/fund-source.entity';
import { FundTransaction } from './entities/fund-transaction.entity';

@Injectable()
export class FundsService {
  constructor(
    @InjectRepository(FundSource) private readonly sourcesRepo: Repository<FundSource>,
    @InjectRepository(FundTransaction) private readonly txRepo: Repository<FundTransaction>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findSources(project_id?: string) {
    let sql = `
      SELECT fs.*,
             COALESCE(SUM(ft.amount), 0) AS received_so_far
      FROM fund_sources fs
      LEFT JOIN fund_transactions ft ON ft.fund_source_id = fs.id
    `;
    const params: any[] = [];
    if (project_id) {
      sql += ' WHERE fs.project_id = $1';
      params.push(project_id);
    }
    sql += ' GROUP BY fs.id ORDER BY fs.created_at DESC';
    return this.dataSource.query(sql, params);
  }

  async findOneSource(id: string) {
    const s = await this.sourcesRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Fund source not found');
    return s;
  }

  createSource(dto: Partial<FundSource>) { return this.sourcesRepo.save(this.sourcesRepo.create(dto)); }

  async updateSource(id: string, dto: Partial<FundSource>) {
    await this.sourcesRepo.update(id, dto);
    return this.findOneSource(id);
  }

  findTransactions(fund_source_id?: string) {
    const q = this.txRepo.createQueryBuilder('ft').leftJoinAndSelect('ft.fund_source', 'fund_source').orderBy('ft.transaction_date', 'DESC');
    if (fund_source_id) q.andWhere('ft.fund_source_id = :id', { id: fund_source_id });
    return q.getMany();
  }

  async createTransaction(dto: Partial<FundTransaction>) {
    const tx = await this.txRepo.save(this.txRepo.create(dto));
    await this.sourcesRepo.query(
      `UPDATE fund_sources SET received_so_far = received_so_far + $1 WHERE id = $2`,
      [dto.amount, dto.fund_source_id]
    );
    return tx;
  }

  async deleteSource(id: string) {
    await this.sourcesRepo.delete(id);
    return { deleted: true };
  }

  async updateTransaction(id: string, dto: Partial<FundTransaction>) {
    const old = await this.txRepo.findOne({ where: { id } });
    await this.txRepo.update(id, dto);
    // Adjust received_so_far if amount changed
    if (old && dto.amount !== undefined) {
      const diff = Number(dto.amount) - Number(old.amount);
      if (diff !== 0) {
        await this.dataSource.query(
          `UPDATE fund_sources SET received_so_far = received_so_far + $1 WHERE id = $2`,
          [diff, old.fund_source_id],
        );
      }
    }
    return this.txRepo.findOne({ where: { id } });
  }

  async deleteTransaction(id: string) {
    const tx = await this.txRepo.findOne({ where: { id } });
    await this.txRepo.delete(id);
    if (tx) {
      await this.dataSource.query(
        `UPDATE fund_sources SET received_so_far = GREATEST(0, received_so_far - $1) WHERE id = $2`,
        [tx.amount, tx.fund_source_id],
      );
    }
    return { deleted: true };
  }
}
