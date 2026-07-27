import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { LandParcel } from '../land/entities/land-parcel.entity';
import { Customer } from '../sales/entities/customer.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
export declare class SearchService {
    private readonly projects;
    private readonly land;
    private readonly customers;
    private readonly sales;
    private readonly expenses;
    private readonly suppliers;
    constructor(projects: Repository<Project>, land: Repository<LandParcel>, customers: Repository<Customer>, sales: Repository<Sale>, expenses: Repository<Expense>, suppliers: Repository<Supplier>);
    search(q: string): Promise<{
        projects: {
            id: string;
            label: string;
            sub: string;
        }[];
        land: {
            id: string;
            label: string;
            sub: string;
        }[];
        customers: {
            id: string;
            label: string;
            sub: string;
        }[];
        sales: {
            id: string;
            label: string;
            sub: string;
        }[];
        expenses: {
            id: string;
            label: string;
            sub: string;
        }[];
        suppliers: {
            id: string;
            label: string;
            sub: string;
        }[];
    }>;
}
