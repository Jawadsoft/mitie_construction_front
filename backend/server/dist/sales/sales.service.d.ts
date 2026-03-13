import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { PropertyUnit } from './entities/property-unit.entity';
import { Sale } from './entities/sale.entity';
import { SaleInstallment } from './entities/sale-installment.entity';
export declare class SalesService {
    private readonly custRepo;
    private readonly unitRepo;
    private readonly saleRepo;
    private readonly installRepo;
    constructor(custRepo: Repository<Customer>, unitRepo: Repository<PropertyUnit>, saleRepo: Repository<Sale>, installRepo: Repository<SaleInstallment>);
    findCustomers(): Promise<Customer[]>;
    createCustomer(dto: Partial<Customer>): Promise<Customer>;
    findUnits(project_id?: string, status?: string): Promise<PropertyUnit[]>;
    createUnit(dto: Partial<PropertyUnit>): Promise<PropertyUnit>;
    updateUnit(id: string, dto: Partial<PropertyUnit>): Promise<PropertyUnit | null>;
    findSales(project_id?: string, customer_id?: string): Promise<Sale[]>;
    findOneSale(id: string): Promise<{
        installments: SaleInstallment[];
        id: string;
        property_unit_id: string;
        customer_id: string;
        sale_date: string;
        total_sale_price: string;
        total_paid: string;
        status: string;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
        customer: Customer;
        property_unit: PropertyUnit;
    }>;
    createSale(dto: {
        sale: Partial<Sale>;
        installments?: Partial<SaleInstallment>[];
    }): Promise<{
        installments: SaleInstallment[];
        id: string;
        property_unit_id: string;
        customer_id: string;
        sale_date: string;
        total_sale_price: string;
        total_paid: string;
        status: string;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
        customer: Customer;
        property_unit: PropertyUnit;
    }>;
    recordPayment(installment_id: string, paid_amount: string, paid_date: string): Promise<SaleInstallment | null>;
    findInstallments(sale_id?: string, status?: string): Promise<SaleInstallment[]>;
    updateCustomer(id: string, dto: Partial<Customer>): Promise<Customer | null>;
    deleteCustomer(id: string): Promise<{
        deleted: boolean;
    }>;
    deleteUnit(id: string): Promise<{
        deleted: boolean;
    }>;
    updateSale(id: string, dto: any): Promise<Sale | null>;
    deleteSale(id: string): Promise<{
        deleted: boolean;
    }>;
}
