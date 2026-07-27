import { DataSource, Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { ExpensePayment } from './entities/expense-payment.entity';
import { AccountingService } from '../accounting/accounting.service';
export declare class ExpensesService {
    private readonly repo;
    private readonly payRepo;
    private readonly dataSource;
    private readonly accounting;
    constructor(repo: Repository<Expense>, payRepo: Repository<ExpensePayment>, dataSource: DataSource, accounting: AccountingService);
    findAll(filters: {
        project_id?: string;
        project_stage_id?: string;
        category?: string;
        status?: string;
        entry_mode?: string;
    }): Promise<Expense[]>;
    findPayments(expense_id: string): Promise<ExpensePayment[]>;
    private resolveEntryMode;
    create(dto: Partial<Expense>): Promise<Expense>;
    payBill(expenseId: string, dto: {
        amount: string;
        paid_date: string;
        payment_method?: string;
        bank_account_id?: string;
        notes?: string;
    }): Promise<{
        expense: Expense | null;
        payment: ExpensePayment;
    }>;
    update(id: string, dto: Partial<Expense>): Promise<Expense>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    getSummary(project_id?: string): Promise<any[]>;
}
