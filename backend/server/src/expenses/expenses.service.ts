import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly repo: Repository<Expense>,
  ) {}

  findAll(filters: { project_id?: string; project_stage_id?: string; category?: string }) {
    const query = this.repo.createQueryBuilder('e').orderBy('e.expense_date', 'DESC');
    if (filters.project_id) query.andWhere('e.project_id = :pid', { pid: filters.project_id });
    if (filters.project_stage_id) query.andWhere('e.project_stage_id = :sid', { sid: filters.project_stage_id });
    if (filters.category) query.andWhere('e.category = :cat', { cat: filters.category });
    return query.getMany();
  }

  create(dto: Partial<Expense>) {
    const required = ['project_id', 'project_stage_id', 'category', 'vendor_type', 'payment_type', 'expense_date', 'amount'];
    for (const field of required) {
      if (!dto[field as keyof Expense]) {
        throw new BadRequestException(`Field '${field}' is required for every expense`);
      }
    }
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: Partial<Expense>) {
    await this.repo.update(id, dto);
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new Error('Expense not found');
    await this.repo.delete(id);
    return { deleted: true };
  }

  async getSummary(project_id?: string) {
    const query = this.repo.createQueryBuilder('e').select('SUM(CAST(e.amount AS NUMERIC))', 'total').addSelect('e.category', 'category').groupBy('e.category');
    if (project_id) query.andWhere('e.project_id = :pid', { pid: project_id });
    return query.getRawMany();
  }
}
