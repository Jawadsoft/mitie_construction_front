import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
export declare class UsersService implements OnModuleInit {
    private readonly usersRepo;
    private readonly rolesRepo;
    constructor(usersRepo: Repository<User>, rolesRepo: Repository<Role>);
    onModuleInit(): Promise<void>;
    findAll(): Promise<User[]>;
    findAllRoles(): Promise<Role[]>;
    findOneByEmail(email: string): Promise<User | null>;
    findOne(id: string): Promise<User>;
    createUser(dto: {
        name: string;
        email: string;
        password: string;
        role_id: string;
    }): Promise<User>;
    updateUser(id: string, dto: {
        name?: string;
        email?: string;
        role_id?: string;
        is_active?: boolean;
        password?: string;
    }): Promise<User>;
    deactivate(id: string): Promise<{
        message: string;
    }>;
}
