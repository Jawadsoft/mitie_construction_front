import { ExpensesService } from './expenses.service';
export declare class ExpensesController {
    private readonly svc;
    constructor(svc: ExpensesService);
    findAll(project_id?: string, project_stage_id?: string, category?: string): Promise<import("./entities/expense.entity").Expense[]>;
    create(dto: any): Promise<import("./entities/expense.entity").Expense>;
    update(id: string, dto: any): Promise<import("./entities/expense.entity").Expense | null>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    getSummary(project_id?: string): Promise<any[]>;
}
