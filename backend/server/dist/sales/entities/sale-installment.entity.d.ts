import { Sale } from './sale.entity';
export declare class SaleInstallment {
    id: string;
    sale_id: string;
    due_date: string;
    due_amount: string;
    paid_amount: string;
    paid_date: string | null;
    status: string;
    notes: string | null;
    sale: Sale;
}
