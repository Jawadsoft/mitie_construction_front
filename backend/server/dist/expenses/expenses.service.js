"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const expense_entity_1 = require("./entities/expense.entity");
let ExpensesService = class ExpensesService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    findAll(filters) {
        const query = this.repo.createQueryBuilder('e').orderBy('e.expense_date', 'DESC');
        if (filters.project_id)
            query.andWhere('e.project_id = :pid', { pid: filters.project_id });
        if (filters.project_stage_id)
            query.andWhere('e.project_stage_id = :sid', { sid: filters.project_stage_id });
        if (filters.category)
            query.andWhere('e.category = :cat', { cat: filters.category });
        return query.getMany();
    }
    create(dto) {
        const required = ['project_id', 'project_stage_id', 'category', 'vendor_type', 'payment_type', 'expense_date', 'amount'];
        for (const field of required) {
            if (!dto[field]) {
                throw new common_1.BadRequestException(`Field '${field}' is required for every expense`);
            }
        }
        return this.repo.save(this.repo.create(dto));
    }
    async update(id, dto) {
        await this.repo.update(id, dto);
        return this.repo.findOne({ where: { id } });
    }
    async remove(id) {
        const e = await this.repo.findOne({ where: { id } });
        if (!e)
            throw new Error('Expense not found');
        await this.repo.delete(id);
        return { deleted: true };
    }
    async getSummary(project_id) {
        const query = this.repo.createQueryBuilder('e').select('SUM(CAST(e.amount AS NUMERIC))', 'total').addSelect('e.category', 'category').groupBy('e.category');
        if (project_id)
            query.andWhere('e.project_id = :pid', { pid: project_id });
        return query.getRawMany();
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(expense_entity_1.Expense)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map