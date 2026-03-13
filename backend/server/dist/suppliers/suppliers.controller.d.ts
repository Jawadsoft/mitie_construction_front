import { SuppliersService } from './suppliers.service';
import { Supplier } from './entities/supplier.entity';
export declare class SuppliersController {
    private readonly svc;
    constructor(svc: SuppliersService);
    findAll(): Promise<Supplier[]>;
    findOne(id: string): Promise<Supplier>;
    create(dto: Partial<Supplier>): Promise<Supplier>;
    update(id: string, dto: Partial<Supplier>): Promise<Supplier>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
