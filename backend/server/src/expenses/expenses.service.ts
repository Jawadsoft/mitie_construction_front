import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { ExpensePayment } from './entities/expense-payment.entity';
import { AccountingService } from '../accounting/accounting.service';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly repo: Repository<Expense>,
    @InjectRepository(ExpensePayment)
    private readonly payRepo: Repository<ExpensePayment>,
    private readonly dataSource: DataSource,
    private readonly accounting: AccountingService,
    private readonly projects: ProjectsService,
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

  async create(dto: Partial<Expense>, userId?: string) {
    const required = ['category', 'vendor_type', 'expense_date', 'amount'];
    for (const field of required) {
      if (!dto[field as keyof Expense]) {
        throw new BadRequestException(`Field '${field}' is required for every expense`);
      }
    }
    const project_id = dto.project_id ? String(dto.project_id) : null;
    const project_stage_id = project_id
      ? await this.projects.resolveExpenseStageId(
          project_id,
          dto.project_stage_id ? String(dto.project_stage_id) : null,
        )
      : null;
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
    const due_date =
      entry_mode === 'BILL'
        ? (dto.due_date || dto.expense_date || null)
        : null;

    return this.dataSource.transaction(async (manager) => {
      const expense = await manager.getRepository(Expense).save(
        manager.getRepository(Expense).create({
          ...dto,
          project_id,
          project_stage_id,
          entry_mode,
          payment_type,
          bank_account_id: entry_mode === 'BILL' ? null : dto.bank_account_id || null,
          due_date,
          amount,
          paid_amount,
          status,
          created_by: userId ?? null,
          updated_by: userId ?? null,
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

  private billStatus(amount: string | number, paid: string | number) {
    if (Number(paid) <= 0.009) return 'Unpaid';
    if (Number(paid) >= Number(amount) - 0.009) return 'Paid';
    return 'Partial';
  }

  async updatePayment(
    expenseId: string,
    paymentId: string,
    dto: {
      amount?: string;
      paid_date?: string;
      payment_method?: string;
      bank_account_id?: string | null;
      notes?: string | null;
    },
  ) {
    return this.dataSource.transaction(async (manager) => {
      const expenseRepo = manager.getRepository(Expense);
      const payRepo = manager.getRepository(ExpensePayment);
      const expense = await expenseRepo.findOne({ where: { id: expenseId } });
      if (!expense) throw new NotFoundException('Expense not found');
      if (expense.entry_mode !== 'BILL') {
        throw new BadRequestException('Only accrual bills have payment history');
      }
      const payment = await payRepo.findOne({ where: { id: paymentId, expense_id: expenseId } });
      if (!payment) throw new NotFoundException('Payment not found');

      const nextAmount =
        dto.amount !== undefined ? Number(dto.amount) : Number(payment.amount);
      if (!(nextAmount > 0)) throw new BadRequestException('Payment amount must be positive');
      const others = await payRepo.find({ where: { expense_id: expenseId } });
      const othersSum = others
        .filter((p) => String(p.id) !== String(paymentId))
        .reduce((sum, p) => sum + Number(p.amount), 0);
      if (othersSum + nextAmount > Number(expense.amount) + 0.009) {
        const max = Number(expense.amount) - othersSum;
        throw new BadRequestException(`Payment exceeds bill balance (max PKR ${max.toFixed(2)})`);
      }

      const method = dto.payment_method !== undefined ? dto.payment_method : payment.payment_method;
      const bank_account_id =
        dto.bank_account_id !== undefined ? dto.bank_account_id || null : payment.bank_account_id;
      const usesBank = method === 'Bank Transfer' || method === 'Cheque' || method === 'Bank';
      if (usesBank && !bank_account_id) {
        throw new BadRequestException('Select a partner bank for this payment');
      }

      await payRepo.update(paymentId, {
        amount: nextAmount.toFixed(2),
        paid_date: dto.paid_date !== undefined ? dto.paid_date : payment.paid_date,
        payment_method: method,
        bank_account_id,
        notes: dto.notes !== undefined ? dto.notes || null : payment.notes,
      });

      const newPaid = (othersSum + nextAmount).toFixed(2);
      await expenseRepo.update(expenseId, {
        paid_amount: newPaid,
        status: this.billStatus(expense.amount, newPaid),
      });

      const updatedPayment = await payRepo.findOne({ where: { id: paymentId } });
      const updatedExpense = await expenseRepo.findOne({ where: { id: expenseId } });
      if (!updatedPayment || !updatedExpense) throw new NotFoundException('Payment not found');

      await this.accounting.deleteJournalByReference(`EXPPMT-${paymentId}`, manager);
      await this.accounting.postExpenseBillPaymentJournal(
        updatedExpense,
        {
          id: updatedPayment.id,
          amount: updatedPayment.amount,
          paid_date: updatedPayment.paid_date,
          payment_method: updatedPayment.payment_method,
          bank_account_id: updatedPayment.bank_account_id,
        },
        manager,
      );

      return { expense: updatedExpense, payment: updatedPayment };
    });
  }

  async removePayment(expenseId: string, paymentId: string) {
    return this.dataSource.transaction(async (manager) => {
      const expenseRepo = manager.getRepository(Expense);
      const payRepo = manager.getRepository(ExpensePayment);
      const expense = await expenseRepo.findOne({ where: { id: expenseId } });
      if (!expense) throw new NotFoundException('Expense not found');
      const payment = await payRepo.findOne({ where: { id: paymentId, expense_id: expenseId } });
      if (!payment) throw new NotFoundException('Payment not found');

      await this.accounting.deleteJournalByReference(`EXPPMT-${paymentId}`, manager);
      await payRepo.delete(paymentId);

      const remaining = await payRepo.find({ where: { expense_id: expenseId } });
      const newPaid = remaining.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2);
      await expenseRepo.update(expenseId, {
        paid_amount: newPaid,
        status: this.billStatus(expense.amount, newPaid),
      });
      const updated = await expenseRepo.findOne({ where: { id: expenseId } });
      return { expense: updated };
    });
  }

  async update(id: string, dto: Partial<Expense>, userId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Expense);
      const expense = await repo.findOne({ where: { id } });
      if (!expense) throw new NotFoundException('Expense not found');

      // Keep original posting mode — switching DIRECT ↔ BILL would break AP/cash history
      const entry_mode = expense.entry_mode === 'BILL' ? 'BILL' : 'DIRECT';
      let payment_type =
        dto.payment_type !== undefined ? String(dto.payment_type) : expense.payment_type;
      if (entry_mode === 'BILL') payment_type = 'Credit';

      const bank_account_id =
        entry_mode === 'BILL'
          ? null
          : dto.bank_account_id !== undefined
            ? dto.bank_account_id || null
            : expense.bank_account_id;

      const usesBank =
        entry_mode === 'DIRECT' &&
        (payment_type === 'Bank Transfer' ||
          payment_type === 'Cheque' ||
          payment_type === 'Bank');
      if (usesBank && !bank_account_id) {
        throw new BadRequestException('Select a partner bank for this payment');
      }

      const nextAmount =
        dto.amount !== undefined ? Number(dto.amount).toFixed(2) : expense.amount;
      if (!(Number(nextAmount) > 0)) {
        throw new BadRequestException('Amount must be positive');
      }

      let paid_amount = expense.paid_amount;
      let status = expense.status;
      if (entry_mode === 'DIRECT') {
        paid_amount = nextAmount;
        status = 'Paid';
      } else {
        if (Number(nextAmount) + 0.009 < Number(expense.paid_amount)) {
          throw new BadRequestException(
            `Amount cannot be less than already paid (PKR ${Number(expense.paid_amount).toFixed(2)})`,
          );
        }
        status =
          Number(expense.paid_amount) <= 0.009
            ? 'Unpaid'
            : Number(expense.paid_amount) >= Number(nextAmount) - 0.009
              ? 'Paid'
              : 'Partial';
      }

      const project_id =
        dto.project_id !== undefined
          ? dto.project_id
            ? String(dto.project_id)
            : null
          : expense.project_id;
      const project_stage_id = project_id
        ? await this.projects.resolveExpenseStageId(
            project_id,
            dto.project_stage_id !== undefined && dto.project_stage_id
              ? String(dto.project_stage_id)
              : expense.project_stage_id,
          )
        : null;

      await repo.update(id, {
        project_id,
        project_stage_id,
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.vendor_type !== undefined ? { vendor_type: dto.vendor_type } : {}),
        ...(dto.supplier_id !== undefined ? { supplier_id: dto.supplier_id || null } : {}),
        ...(dto.contractor_id !== undefined
          ? { contractor_id: dto.contractor_id || null }
          : {}),
        payment_type,
        bank_account_id,
        ...(dto.expense_date !== undefined ? { expense_date: dto.expense_date } : {}),
        ...(entry_mode === 'BILL' && dto.due_date !== undefined
          ? { due_date: dto.due_date || null }
          : entry_mode === 'DIRECT'
            ? { due_date: null }
            : {}),
        amount: nextAmount,
        paid_amount,
        status,
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(userId ? { updated_by: userId } : {}),
      });

      const updated = await repo.findOne({ where: { id } });
      if (!updated) throw new NotFoundException('Expense not found');

      // Rebuild EXP-* so GL date/amount/bank/project match the expense
      await this.accounting.deleteJournalByReference(`EXP-${id}`, manager);
      await this.accounting.postExpenseJournal(updated, manager);

      // If project changed on a bill, rebuild payment journals for project link
      if (entry_mode === 'BILL' && String(project_id) !== String(expense.project_id)) {
        const payments = await manager.getRepository(ExpensePayment).find({
          where: { expense_id: id },
        });
        for (const p of payments) {
          await this.accounting.deleteJournalByReference(`EXPPMT-${p.id}`, manager);
          await this.accounting.postExpenseBillPaymentJournal(
            updated,
            {
              id: p.id,
              amount: p.amount,
              paid_date: p.paid_date,
              payment_method: p.payment_method,
              bank_account_id: p.bank_account_id,
            },
            manager,
          );
        }
      }

      return updated;
    });
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
