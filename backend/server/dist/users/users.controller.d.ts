import { UsersService } from './users.service';
export declare class UsersController {
    private readonly svc;
    constructor(svc: UsersService);
    findAll(): Promise<import("./entities/user.entity").User[]>;
    findRoles(): Promise<import("./entities/role.entity").Role[]>;
    findOne(id: string): Promise<import("./entities/user.entity").User>;
    create(dto: any): Promise<import("./entities/user.entity").User>;
    update(id: string, dto: any): Promise<import("./entities/user.entity").User>;
    deactivate(id: string): Promise<{
        message: string;
    }>;
}
