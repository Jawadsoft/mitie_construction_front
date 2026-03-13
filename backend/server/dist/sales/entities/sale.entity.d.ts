import { Customer } from './customer.entity';
import { PropertyUnit } from './property-unit.entity';
export declare class Sale {
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
}
