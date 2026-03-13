"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("./entities/user.entity");
const role_entity_1 = require("./entities/role.entity");
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
let UsersService = class UsersService {
    usersRepo;
    rolesRepo;
    constructor(usersRepo, rolesRepo) {
        this.usersRepo = usersRepo;
        this.rolesRepo = rolesRepo;
    }
    async onModuleInit() {
        for (const r of DEFAULT_ROLES) {
            const exists = await this.rolesRepo.findOne({ where: { name: r.name } });
            if (!exists)
                await this.rolesRepo.save(this.rolesRepo.create(r));
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
    findOneByEmail(email) {
        return this.usersRepo.findOne({ where: { email }, relations: ['role'] });
    }
    async findOne(id) {
        const u = await this.usersRepo.findOne({ where: { id }, relations: ['role'] });
        if (!u)
            throw new common_1.NotFoundException('User not found');
        return u;
    }
    async createUser(dto) {
        const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
        if (existing)
            throw new common_1.BadRequestException('Email already in use');
        const password_hash = await bcrypt.hash(dto.password, 10);
        const user = await this.usersRepo.save(this.usersRepo.create({
            name: dto.name, email: dto.email, password_hash, role_id: dto.role_id, is_active: true,
        }));
        return this.findOne(user.id);
    }
    async updateUser(id, dto) {
        await this.findOne(id);
        const update = {};
        if (dto.name)
            update.name = dto.name;
        if (dto.email)
            update.email = dto.email;
        if (dto.role_id)
            update.role_id = dto.role_id;
        if (dto.is_active !== undefined)
            update.is_active = dto.is_active;
        if (dto.password)
            update.password_hash = await bcrypt.hash(dto.password, 10);
        await this.usersRepo.update(id, update);
        return this.findOne(id);
    }
    async deactivate(id) {
        await this.findOne(id);
        await this.usersRepo.update(id, { is_active: false });
        return { message: 'User deactivated' };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map