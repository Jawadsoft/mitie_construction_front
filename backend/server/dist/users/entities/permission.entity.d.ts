import { RolePermission } from './role-permission.entity';
export declare class Permission {
    id: string;
    code: string;
    name: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
    rolePermissions: RolePermission[];
}
