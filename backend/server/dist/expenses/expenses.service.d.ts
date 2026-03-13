import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
export declare class ExpensesService {
    private readonly repo;
    constructor(repo: Repository<Expense>);
    findAll(filters: {
        project_id?: string;
        project_stage_id?: string;
        category?: string;
    }): Promise<Expense[]>;
    create(dto: Partial<Expense>): Promise<Expense>;
    update(id: string, dto: Partial<Expense>): Promise<Expense | null>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    getSummary(project_id?: string): Promise<any[]>;
}
