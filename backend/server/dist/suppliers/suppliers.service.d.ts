import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
export declare class SuppliersService {
    private readonly repo;
    constructor(repo: Repository<Supplier>);
    findAll(): Promise<Supplier[]>;
    findOne(id: string): Promise<Supplier>;
    create(dto: Partial<Supplier>): Promise<Supplier>;
    update(id: string, dto: Partial<Supplier>): Promise<Supplier>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
