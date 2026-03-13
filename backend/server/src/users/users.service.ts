import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';

const DEFAULT_ROLES = [
  { name: 'Admin', description: 'System administrator – full access' },
  { name: 'Owner / Director', description: 'Business owner with full visibility' },
  { name: 'Project Manager', description: 'Manages construction projects' },
  { name: 'Site Engineer', description: 'On-site technical supervisor' },
  { name: 'Procurement Officer', description: 'Handles purchases and suppliers' },
  { name: 'Accountant', description: 'Finance and accounting access' },
  { name: 'Sales Manager', description: 'Manages property sales' },
  { name: 'Store Keeper', description: 'Manages material inventory' },
  { name: 'Supervisor', description: 'Site supervisor' },
];

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Role) private readonly rolesRepo: Repository<Role>,
  ) {}

  async onModuleInit() {
    for (const r of DEFAULT_ROLES) {
      const exists = await this.rolesRepo.findOne({ where: { name: r.name } });
      if (!exists) await this.rolesRepo.save(this.rolesRepo.create(r));
    }

    const adminRole = await this.rolesRepo.findOne({ where: { name: 'Admin' } });
    const existingAdmin = await this.usersRepo.findOne({ where: { email: 'admin@example.com' } });
    if (!existingAdmin && adminRole) {
      const password_hash = await bcrypt.hash('Admin@123', 10);
      await this.usersRepo.save(this.usersRepo.create({
        name: 'Administrator', email: 'admin@example.com',
        password_hash, role_id: adminRole.id, is_active: true,
      }));
      console.log('Seeded admin user: email=admin@example.com, password=Admin@123');
    }
  }

  findAll() {
    return this.usersRepo.find({ relations: ['role'], order: { name: 'ASC' } });
  }

  findAllRoles() {
    return this.rolesRepo.find({ order: { name: 'ASC' } });
  }

  findOneByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email }, relations: ['role'] });
  }

  async findOne(id: string) {
    const u = await this.usersRepo.findOne({ where: { id }, relations: ['role'] });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async createUser(dto: { name: string; email: string; password: string; role_id: string }) {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already in use');
    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersRepo.save(this.usersRepo.create({
      name: dto.name, email: dto.email, password_hash, role_id: dto.role_id, is_active: true,
    }));
    return this.findOne(user.id);
  }

  async updateUser(id: string, dto: { name?: string; email?: string; role_id?: string; is_active?: boolean; password?: string }) {
    await this.findOne(id);
    const update: Partial<User> = {};
    if (dto.name) update.name = dto.name;
    if (dto.email) update.email = dto.email;
    if (dto.role_id) update.role_id = dto.role_id;
    if (dto.is_active !== undefined) update.is_active = dto.is_active;
    if (dto.password) update.password_hash = await bcrypt.hash(dto.password, 10);
    await this.usersRepo.update(id, update);
    return this.findOne(id);
  }

  async deactivate(id: string) {
    await this.findOne(id);
    await this.usersRepo.update(id, { is_active: false });
    return { message: 'User deactivated' };
  }
}
