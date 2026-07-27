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
exports.MaterialRequestsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const material_request_entity_1 = require("./entities/material-request.entity");
const material_request_item_entity_1 = require("./entities/material-request-item.entity");
const purchase_order_entity_1 = require("./entities/purchase-order.entity");
const po_item_entity_1 = require("./entities/po-item.entity");
let MaterialRequestsService = class MaterialRequestsService {
    mrRepo;
    itemRepo;
    poRepo;
    poItemRepo;
    constructor(mrRepo, itemRepo, poRepo, poItemRepo) {
        this.mrRepo = mrRepo;
        this.itemRepo = itemRepo;
        this.poRepo = poRepo;
        this.poItemRepo = poItemRepo;
    }
    async nextRequestNo() {
        const year = new Date().getFullYear();
        const count = await this.mrRepo
            .createQueryBuilder('mr')
            .where('mr.request_no LIKE :prefix', { prefix: `MR-${year}-%` })
            .getCount();
        return `MR-${year}-${String(count + 1).padStart(4, '0')}`;
    }
    findAll(filters) {
        const q = this.mrRepo.createQueryBuilder('mr').orderBy('mr.request_date', 'DESC');
        if (filters.project_id)
            q.andWhere('mr.project_id = :pid', { pid: filters.project_id });
        if (filters.status)
            q.andWhere('mr.status = :status', { status: filters.status });
        return q.getMany();
    }
    async findOne(id) {
        const mr = await this.mrRepo.findOne({ where: { id } });
        if (!mr)
            throw new common_1.NotFoundException('Material request not found');
        const items = await this.itemRepo.find({ where: { material_request_id: id } });
        return { ...mr, items };
    }
    async create(dto) {
        if (!dto.request?.project_id)
            throw new common_1.BadRequestException('project_id is required');
        if (!dto.request?.requested_by)
            throw new common_1.BadRequestException('requested_by is required');
        if (!dto.items?.length)
            throw new common_1.BadRequestException('At least one item is required');
        const request_no = await this.nextRequestNo();
        const mr = await this.mrRepo.save(this.mrRepo.create({
            ...dto.request,
            request_no,
            request_date: dto.request.request_date || new Date().toISOString().slice(0, 10),
            status: dto.request.status || 'Draft',
            project_stage_id: dto.request.project_stage_id ?? null,
            needed_by_date: dto.request.needed_by_date ?? null,
            notes: dto.request.notes ?? null,
        }));
        for (const item of dto.items) {
            await this.itemRepo.save(this.itemRepo.create({
                material_request_id: mr.id,
                material_id: item.material_id ?? null,
                material_name: item.material_name,
                unit: item.unit || 'pcs',
                quantity_requested: item.quantity_requested,
                quantity_approved: null,
                estimated_unit_cost: item.estimated_unit_cost ?? null,
                notes: item.notes ?? null,
            }));
        }
        return this.findOne(mr.id);
    }
    async update(id, dto) {
        const mr = await this.findOne(id);
        if (!['Draft', 'Rejected'].includes(mr.status)) {
            throw new common_1.BadRequestException('Only Draft or Rejected requests can be edited');
        }
        const { status: _s, purchase_order_id: _p, approved_by: _a, approved_at: _t, ...safe } = dto;
        await this.mrRepo.update(id, safe);
        return this.findOne(id);
    }
    async submit(id) {
        const mr = await this.findOne(id);
        if (mr.status !== 'Draft' && mr.status !== 'Rejected') {
            throw new common_1.BadRequestException('Only Draft or Rejected requests can be submitted');
        }
        if (!mr.items?.length)
            throw new common_1.BadRequestException('Request has no items');
        await this.mrRepo.update(id, { status: 'Submitted', rejection_reason: null });
        return this.findOne(id);
    }
    async approve(id, dto) {
        const mr = await this.findOne(id);
        if (mr.status !== 'Submitted') {
            throw new common_1.BadRequestException('Only Submitted requests can be approved');
        }
        if (!dto.approved_by)
            throw new common_1.BadRequestException('approved_by is required');
        for (const item of mr.items || []) {
            const override = dto.items?.find((i) => i.id === item.id);
            const qty = override?.quantity_approved ?? item.quantity_requested;
            await this.itemRepo.update(item.id, { quantity_approved: qty });
        }
        await this.mrRepo.update(id, {
            status: 'Approved',
            approved_by: dto.approved_by,
            approved_at: new Date(),
            rejection_reason: null,
        });
        return this.findOne(id);
    }
    async reject(id, dto) {
        const mr = await this.findOne(id);
        if (mr.status !== 'Submitted') {
            throw new common_1.BadRequestException('Only Submitted requests can be rejected');
        }
        await this.mrRepo.update(id, {
            status: 'Rejected',
            approved_by: dto.approved_by ?? null,
            approved_at: new Date(),
            rejection_reason: dto.rejection_reason ?? 'Rejected',
        });
        return this.findOne(id);
    }
    async convertToPo(id, dto) {
        const mr = await this.findOne(id);
        if (mr.status !== 'Approved') {
            throw new common_1.BadRequestException('Only Approved requests can be converted to a PO');
        }
        if (!dto.supplier_id)
            throw new common_1.BadRequestException('supplier_id is required');
        const items = (mr.items || []).filter((i) => Number(i.quantity_approved ?? i.quantity_requested) > 0);
        if (!items.length)
            throw new common_1.BadRequestException('No approved quantities to convert');
        const po = await this.poRepo.save(this.poRepo.create({
            project_id: mr.project_id,
            project_stage_id: mr.project_stage_id,
            supplier_id: dto.supplier_id,
            material_request_id: mr.id,
            created_by: dto.created_by ?? null,
            order_date: dto.order_date || new Date().toISOString().slice(0, 10),
            expected_delivery: dto.expected_delivery ?? null,
            status: 'Draft',
            notes: dto.notes ?? mr.notes,
            total_amount: '0',
        }));
        let total = 0;
        for (const item of items) {
            const qty = Number(item.quantity_approved ?? item.quantity_requested);
            const unit_price = Number(item.estimated_unit_cost ?? 0);
            const total_price = qty * unit_price;
            total += total_price;
            await this.poItemRepo.save(this.poItemRepo.create({
                purchase_order_id: po.id,
                material_id: item.material_id,
                material_request_item_id: item.id,
                material_name: item.material_name,
                unit: item.unit,
                quantity: qty.toString(),
                unit_price: unit_price.toFixed(2),
                total_price: total_price.toFixed(2),
                received_qty: '0',
            }));
        }
        await this.poRepo.update(po.id, { total_amount: total.toFixed(2) });
        await this.mrRepo.update(id, { status: 'Converted', purchase_order_id: po.id });
        return this.findOne(id);
    }
};
exports.MaterialRequestsService = MaterialRequestsService;
exports.MaterialRequestsService = MaterialRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(material_request_entity_1.MaterialRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(material_request_item_entity_1.MaterialRequestItem)),
    __param(2, (0, typeorm_1.InjectRepository)(purchase_order_entity_1.PurchaseOrder)),
    __param(3, (0, typeorm_1.InjectRepository)(po_item_entity_1.PoItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], MaterialRequestsService);
//# sourceMappingURL=material-requests.service.js.map