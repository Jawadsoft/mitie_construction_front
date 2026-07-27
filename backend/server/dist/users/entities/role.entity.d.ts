import { User } from './user.entity';
import { RolePermission } from './role-permission.entity';
export declare class Role {
    id: string;
    name: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
    users: User[];
    rolePermissions: RolePermission[];
}
