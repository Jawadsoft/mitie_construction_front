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
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_entity_1 = require("./entities/customer.entity");
const property_unit_entity_1 = require("./entities/property-unit.entity");
const sale_entity_1 = require("./entities/sale.entity");
const sale_installment_entity_1 = require("./entities/sale-installment.entity");
let SalesService = class SalesService {
    custRepo;
    unitRepo;
    saleRepo;
    installRepo;
    constructor(custRepo, unitRepo, saleRepo, installRepo) {
        this.custRepo = custRepo;
        this.unitRepo = unitRepo;
        this.saleRepo = saleRepo;
        this.installRepo = installRepo;
    }
    findCustomers() { return this.custRepo.find({ order: { name: 'ASC' } }); }
    createCustomer(dto) { return this.custRepo.save(this.custRepo.create(dto)); }
    findUnits(project_id, status) {
        const q = this.unitRepo.createQueryBuilder('u').orderBy('u.unit_number', 'ASC');
        if (project_id)
            q.andWhere('u.project_id = :pid', { pid: project_id });
        if (status)
            q.andWhere('u.status = :status', { status });
        return q.getMany();
    }
    createUnit(dto) { return this.unitRepo.save(this.unitRepo.create(dto)); }
    async updateUnit(id, dto) {
        await this.unitRepo.update(id, dto);
        return this.unitRepo.findOne({ where: { id } });
    }
    async findSales(project_id, customer_id) {
        const q = this.saleRepo.createQueryBuilder('s')
            .leftJoinAndSelect('s.customer', 'customer')
            .leftJoinAndSelect('s.property_unit', 'property_unit')
            .orderBy('s.sale_date', 'DESC');
        if (project_id)
            q.andWhere('s.property_unit.project_id = :pid', { pid: project_id });
        if (customer_id)
            q.andWhere('s.customer_id = :cid', { cid: customer_id });
        return q.getMany();
    }
    async findOneSale(id) {
        const sale = await this.saleRepo.findOne({ where: { id }, relations: ['customer', 'property_unit'] });
        if (!sale)
            throw new common_1.NotFoundException('Sale not found');
        const installments = await this.installRepo.find({ where: { sale_id: id }, order: { due_date: 'ASC' } });
        return { ...sale, installments };
    }
    async createSale(dto) {
        const sale = await this.saleRepo.save(this.saleRepo.create(dto.sale));
        if (dto.installments?.length) {
            for (const inst of dto.installments) {
                await this.installRepo.save(this.installRepo.create({ ...inst, sale_id: sale.id }));
            }
        }
        await this.unitRepo.update(sale.property_unit_id, { status: 'Sold' });
        return this.findOneSale(sale.id);
    }
    async recordPayment(installment_id, paid_amount, paid_date) {
        const inst = await this.installRepo.findOne({ where: { id: installment_id } });
        if (!inst)
            throw new common_1.NotFoundException('Installment not found');
        const newPaid = Number(inst.paid_amount) + Number(paid_amount);
        const status = newPaid >= Number(inst.due_amount) ? 'Paid' : 'Partial';
        await this.installRepo.update(installment_id, { paid_amount: newPaid.toString(), status, paid_date });
        await this.saleRepo.query(`UPDATE sales SET total_paid = total_paid + ? WHERE id = ?`, [paid_amount, inst.sale_id]);
        return this.installRepo.findOne({ where: { id: installment_id } });
    }
    findInstallments(sale_id, status) {
        const q = this.installRepo.createQueryBuilder('i').leftJoinAndSelect('i.sale', 'sale').orderBy('i.due_date', 'ASC');
        if (sale_id)
            q.andWhere('i.sale_id = :sid', { sid: sale_id });
        if (status)
            q.andWhere('i.status = :status', { status });
        return q.getMany();
    }
    async updateCustomer(id, dto) {
        await this.custRepo.update(id, dto);
        return this.custRepo.findOne({ where: { id } });
    }
    async deleteCustomer(id) {
        await this.custRepo.delete(id);
        return { deleted: true };
    }
    async deleteUnit(id) {
        await this.unitRepo.delete(id);
        return { deleted: true };
    }
    async updateSale(id, dto) {
        await this.saleRepo.update(id, dto);
        return this.saleRepo.findOne({ where: { id } });
    }
    async deleteSale(id) {
        await this.installRepo.delete({ sale_id: id });
        await this.saleRepo.delete(id);
        return { deleted: true };
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __param(1, (0, typeorm_1.InjectRepository)(property_unit_entity_1.PropertyUnit)),
    __param(2, (0, typeorm_1.InjectRepository)(sale_entity_1.Sale)),
    __param(3, (0, typeorm_1.InjectRepository)(sale_installment_entity_1.SaleInstallment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], SalesService);
//# sourceMappingURL=sales.service.js.map