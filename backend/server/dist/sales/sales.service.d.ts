import { DataSource, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { PropertyUnit } from './entities/property-unit.entity';
import { Sale } from './entities/sale.entity';
import { SaleInstallment } from './entities/sale-installment.entity';
import { AccountingService } from '../accounting/accounting.service';
export declare class SalesService {
    private readonly custRepo;
    private readonly unitRepo;
    private readonly saleRepo;
    private readonly installRepo;
    private readonly dataSource;
    private readonly accounting;
    constructor(custRepo: Repository<Customer>, unitRepo: Repository<PropertyUnit>, saleRepo: Repository<Sale>, installRepo: Repository<SaleInstallment>, dataSource: DataSource, accounting: AccountingService);
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
    private applyInstallmentPayment;
    recordPayment(installment_id: string, paid_amount: string, paid_date: string, bank_account_id?: string | null): Promise<SaleInstallment | null>;
    collectOnSale(saleId: string, dto: {
        paid_amount: string | number;
        paid_date: string;
        bank_account_id?: string | null;
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
    adjustSaleCollection(saleId: string, dto: {
        total_collected: string | number;
        paid_date: string;
        bank_account_id?: string | null;
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
    findInstallments(sale_id?: string, status?: string): Promise<SaleInstallment[]>;
    setInstallmentBank(installment_id: string, bank_account_id: string | null): Promise<SaleInstallment | null>;
    updateCustomer(id: string, dto: Partial<Customer>): Promise<Customer | null>;
    deleteCustomer(id: string): Promise<{
        deleted: boolean;
    }>;
    deleteUnit(id: string): Promise<{
        deleted: boolean;
    }>;
    updateSale(id: string, dto: Partial<Sale>): Promise<Sale | null>;
    deleteSale(id: string): Promise<{
        deleted: boolean;
    }>;
}
