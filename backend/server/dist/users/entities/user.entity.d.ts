import { Role } from './role.entity';
export declare class User {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    role_id: string;
    is_active: boolean;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
    role: Role;
}
