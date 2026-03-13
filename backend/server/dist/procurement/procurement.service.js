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
exports.ProcurementService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const purchase_order_entity_1 = require("./entities/purchase-order.entity");
const po_item_entity_1 = require("./entities/po-item.entity");
const material_receipt_entity_1 = require("./entities/material-receipt.entity");
let ProcurementService = class ProcurementService {
    poRepo;
    itemRepo;
    receiptRepo;
    constructor(poRepo, itemRepo, receiptRepo) {
        this.poRepo = poRepo;
        this.itemRepo = itemRepo;
        this.receiptRepo = receiptRepo;
    }
    findAll(filters) {
        const q = this.poRepo.createQueryBuilder('po').orderBy('po.order_date', 'DESC');
        if (filters.project_id)
            q.andWhere('po.project_id = :pid', { pid: filters.project_id });
        if (filters.status)
            q.andWhere('po.status = :status', { status: filters.status });
        if (filters.supplier_id)
            q.andWhere('po.supplier_id = :sid', { sid: filters.supplier_id });
        return q.getMany();
    }
    async findOne(id) {
        const po = await this.poRepo.findOne({ where: { id } });
        if (!po)
            throw new common_1.NotFoundException('Purchase order not found');
        const items = await this.itemRepo.find({ where: { purchase_order_id: id } });
        const receipts = await this.receiptRepo.find({ where: { purchase_order_id: id }, order: { receipt_date: 'DESC' } });
        return { ...po, items, receipts };
    }
    async create(dto) {
        const po = await this.poRepo.save(this.poRepo.create(dto.order));
        const savedItems = [];
        for (const item of dto.items || []) {
            const saved = await this.itemRepo.save(this.itemRepo.create({ ...item, purchase_order_id: po.id }));
            savedItems.push(saved);
        }
        const total = savedItems.reduce((sum, i) => sum + Number(i.total_price), 0);
        await this.poRepo.update(po.id, { total_amount: total.toString() });
        return this.findOne(po.id);
    }
    async update(id, dto) {
        await this.findOne(id);
        await this.poRepo.update(id, dto);
        return this.findOne(id);
    }
    async createReceipt(purchase_order_id, dto) {
        const po = await this.poRepo.findOne({ where: { id: purchase_order_id } });
        if (!po)
            throw new common_1.NotFoundException('Purchase order not found');
        const receipt = await this.receiptRepo.save(this.receiptRepo.create({ purchase_order_id, receipt_date: dto.receipt_date, notes: dto.notes ?? null, status: 'Received' }));
        await this.poRepo.update(purchase_order_id, { status: 'Received' });
        return receipt;
    }
    getReceipts(purchase_order_id) {
        const q = this.receiptRepo.createQueryBuilder('r')
            .leftJoinAndSelect('r.purchase_order', 'po')
            .orderBy('r.receipt_date', 'DESC');
        if (purchase_order_id)
            q.andWhere('r.purchase_order_id = :id', { id: purchase_order_id });
        return q.getMany();
    }
    async remove(id) {
        await this.itemRepo.delete({ purchase_order_id: id });
        await this.receiptRepo.delete({ purchase_order_id: id });
        await this.poRepo.delete(id);
        return { deleted: true };
    }
};
exports.ProcurementService = ProcurementService;
exports.ProcurementService = ProcurementService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(purchase_order_entity_1.PurchaseOrder)),
    __param(1, (0, typeorm_1.InjectRepository)(po_item_entity_1.PoItem)),
    __param(2, (0, typeorm_1.InjectRepository)(material_receipt_entity_1.MaterialReceipt)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ProcurementService);
//# sourceMappingURL=procurement.service.js.map