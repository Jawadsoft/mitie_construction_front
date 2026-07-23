import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { ExpensePayment } from './entities/expense-payment.entity';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly repo: Repository<Expense>,
    @InjectRepository(ExpensePayment)
    private readonly payRepo: Repository<ExpensePayment>,
    private readonly dataSource: DataSource,
    private readonly accounting: AccountingService,
  ) {}

  findAll(filters: {
    project_id?: string;
    project_stage_id?: string;
    category?: string;
    status?: string;
    entry_mode?: string;
  }) {
    const query = this.repo.createQueryBuilder('e').orderBy('e.expense_date', 'DESC');
    if (filters.project_id) query.andWhere('e.project_id = :pid', { pid: filters.project_id });
    if (filters.project_stage_id) query.andWhere('e.project_stage_id = :sid', { sid: filters.project_stage_id });
    if (filters.category) query.andWhere('e.category = :cat', { cat: filters.category });
    if (filters.status) query.andWhere('e.status = :status', { status: filters.status });
    if (filters.entry_mode) query.andWhere('e.entry_mode = :mode', { mode: filters.entry_mode });
    return query.getMany();
  }

  findPayments(expense_id: string) {
    return this.payRepo.find({
      where: { expense_id },
      order: { paid_date: 'DESC', id: 'DESC' },
    });
  }

  private resolveEntryMode(dto: Partial<Expense>): 'DIRECT' | 'BILL' {
    if (dto.entry_mode === 'BILL' || dto.entry_mode === 'DIRECT') return dto.entry_mode;
    if (dto.payment_type === 'Credit') return 'BILL';
    return 'DIRECT';
  }

  async create(dto: Partial<Expense>) {
    const required = ['project_id', 'project_stage_id', 'category', 'vendor_type', 'expense_date', 'amount'];
    for (const field of required) {
      if (!dto[field as keyof Expense]) {
        throw new BadRequestException(`Field '${field}' is required for every expense`);
      }
    }
    const entry_mode = this.resolveEntryMode(dto);
    let payment_type = dto.payment_type || (entry_mode === 'BILL' ? 'Credit' : 'Cash');
    if (entry_mode === 'BILL') payment_type = 'Credit';

    const usesBank =
      entry_mode === 'DIRECT' &&
      (payment_type === 'Bank Transfer' || payment_type === 'Cheque' || payment_type === 'Bank');
    if (usesBank && !dto.bank_account_id) {
      throw new BadRequestException('Select a partner bank for this payment');
    }

    const amount = Number(dto.amount).toFixed(2);
    const paid_amount = entry_mode === 'DIRECT' ? amount : '0.00';
    const status = entry_mode === 'DIRECT' ? 'Paid' : 'Unpaid';

    return this.dataSource.transaction(async (manager) => {
      const expense = await manager.getRepository(Expense).save(
        manager.getRepository(Expense).create({
          ...dto,
          entry_mode,
          payment_type,
          bank_account_id: entry_mode === 'BILL' ? null : dto.bank_account_id || null,
          amount,
          paid_amount,
          status,
        }),
      );
      await this.accounting.postExpenseJournal(expense, manager);
      return expense;
    });
  }

  async payBill(
    expenseId: string,
    dto: {
      amount: string;
      paid_date: string;
      payment_method?: string;
      bank_account_id?: string;
      notes?: string;
    },
  ) {
    if (!dto.amount || !dto.paid_date) {
      throw new BadRequestException('amount and paid_date are required');
    }
    const method = dto.payment_method || 'Cash';
    const usesBank = method === 'Bank Transfer' || method === 'Cheque' || method === 'Bank';
    if (usesBank && !dto.bank_account_id) {
      throw new BadRequestException('Select a partner bank for this payment');
    }
    return this.dataSource.transaction(async (manager) => {
      const expenseRepo = manager.getRepository(Expense);
      const payRepo = manager.getRepository(ExpensePayment);
      const expense = await expenseRepo.findOne({ where: { id: expenseId } });
      if (!expense) throw new NotFoundException('Expense not found');
      if (expense.entry_mode !== 'BILL') {
        throw new BadRequestException('Only accrual bills can receive payments');
      }
      if (expense.status === 'Paid') {
        throw new BadRequestException('Bill is already fully paid');
      }

      const payAmt = Number(dto.amount);
      if (!(payAmt > 0)) throw new BadRequestException('Payment amount must be positive');
      const balance = Number(expense.amount) - Number(expense.paid_amount);
      if (payAmt > balance + 0.009) {
        throw new BadRequestException(`Payment exceeds balance (PKR ${balance.toFixed(2)})`);
      }

      const payment = await payRepo.save(
        payRepo.create({
          expense_id: expenseId,
          amount: payAmt.toFixed(2),
          paid_date: dto.paid_date,
          payment_method: method,
          bank_account_id: dto.bank_account_id || null,
          notes: dto.notes || null,
        }),
      );

      const newPaid = (Number(expense.paid_amount) + payAmt).toFixed(2);
      const status =
        Number(newPaid) >= Number(expense.amount) - 0.009 ? 'Paid' : 'Partial';
      await expenseRepo.update(expenseId, { paid_amount: newPaid, status });

      await this.accounting.postExpenseBillPaymentJournal(
        expense,
        {
          id: payment.id,
          amount: payment.amount,
          paid_date: payment.paid_date,
          payment_method: payment.payment_method,
          bank_account_id: payment.bank_account_id,
        },
        manager,
      );

      const updated = await expenseRepo.findOne({ where: { id: expenseId } });
      return { expense: updated, payment };
    });
  }

  async update(id: string, dto: Partial<Expense>) {
    const { entry_mode: _m, paid_amount: _p, status: _s, amount: _a, ...safe } = dto as Partial<Expense> & {
      entry_mode?: string;
    };
    await this.repo.update(id, safe);
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Expense);
      const payRepo = manager.getRepository(ExpensePayment);
      const e = await repo.findOne({ where: { id } });
      if (!e) throw new BadRequestException('Expense not found');
      const payments = await payRepo.find({ where: { expense_id: id } });
      for (const p of payments) {
        await this.accounting.deleteJournalByReference(`EXPPMT-${p.id}`, manager);
      }
      await payRepo.delete({ expense_id: id });
      await this.accounting.deleteJournalByReference(`EXP-${id}`, manager);
      await repo.delete(id);
      return { deleted: true };
    });
  }

  async getSummary(project_id?: string) {
    const query = this.repo
      .createQueryBuilder('e')
      .select('SUM(CAST(e.amount AS NUMERIC))', 'total')
      .addSelect('e.category', 'category')
      .groupBy('e.category');
    if (project_id) query.andWhere('e.project_id = :pid', { pid: project_id });
    return query.getRawMany();
  }
}
