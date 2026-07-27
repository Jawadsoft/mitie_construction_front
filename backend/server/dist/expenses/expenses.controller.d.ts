import { ExpensesService } from './expenses.service';
export declare class ExpensesController {
    private readonly svc;
    constructor(svc: ExpensesService);
    findAll(project_id?: string, project_stage_id?: string, category?: string, status?: string, entry_mode?: string): Promise<import("./entities/expense.entity").Expense[]>;
    getSummary(project_id?: string): Promise<any[]>;
    findPayments(id: string): Promise<import("./entities/expense-payment.entity").ExpensePayment[]>;
    create(dto: any): Promise<import("./entities/expense.entity").Expense>;
    payBill(id: string, dto: any): Promise<{
        expense: import("./entities/expense.entity").Expense | null;
        payment: import("./entities/expense-payment.entity").ExpensePayment;
    }>;
    update(id: string, dto: any): Promise<import("./entities/expense.entity").Expense>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
