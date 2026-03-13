import { SalesService } from './sales.service';
export declare class SalesController {
    private readonly svc;
    constructor(svc: SalesService);
    findCustomers(): Promise<import("./entities/customer.entity").Customer[]>;
    createCustomer(dto: any): Promise<import("./entities/customer.entity").Customer>;
    updateCustomer(id: string, dto: any): Promise<import("./entities/customer.entity").Customer | null>;
    deleteCustomer(id: string): Promise<{
        deleted: boolean;
    }>;
    findUnits(project_id?: string, status?: string): Promise<import("./entities/property-unit.entity").PropertyUnit[]>;
    createUnit(dto: any): Promise<import("./entities/property-unit.entity").PropertyUnit>;
    updateUnit(id: string, dto: any): Promise<import("./entities/property-unit.entity").PropertyUnit | null>;
    deleteUnit(id: string): Promise<{
        deleted: boolean;
    }>;
    findSales(project_id?: string, customer_id?: string): Promise<import("./entities/sale.entity").Sale[]>;
    findOneSale(id: string): Promise<{
        installments: import("./entities/sale-installment.entity").SaleInstallment[];
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
        customer: import("./entities/customer.entity").Customer;
        property_unit: import("./entities/property-unit.entity").PropertyUnit;
    }>;
    createSale(dto: any): Promise<{
        installments: import("./entities/sale-installment.entity").SaleInstallment[];
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
        customer: import("./entities/customer.entity").Customer;
        property_unit: import("./entities/property-unit.entity").PropertyUnit;
    }>;
    updateSale(id: string, dto: any): Promise<import("./entities/sale.entity").Sale | null>;
    deleteSale(id: string): Promise<{
        deleted: boolean;
    }>;
    findInstallments(sale_id?: string, status?: string): Promise<import("./entities/sale-installment.entity").SaleInstallment[]>;
    recordPayment(id: string, dto: any): Promise<import("./entities/sale-installment.entity").SaleInstallment | null>;
}
