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
exports.LabourService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const labour_contractor_entity_1 = require("./entities/labour-contractor.entity");
const labour_attendance_entity_1 = require("./entities/labour-attendance.entity");
const labour_payment_entity_1 = require("./entities/labour-payment.entity");
const labour_advance_entity_1 = require("./entities/labour-advance.entity");
const accounting_service_1 = require("../accounting/accounting.service");
let LabourService = class LabourService {
    contractorsRepo;
    attendanceRepo;
    paymentsRepo;
    advancesRepo;
    dataSource;
    accounting;
    constructor(contractorsRepo, attendanceRepo, paymentsRepo, advancesRepo, dataSource, accounting) {
        this.contractorsRepo = contractorsRepo;
        this.attendanceRepo = attendanceRepo;
        this.paymentsRepo = paymentsRepo;
        this.advancesRepo = advancesRepo;
        this.dataSource = dataSource;
        this.accounting = accounting;
    }
    findAllContractors() { return this.contractorsRepo.find({ order: { name: 'ASC' } }); }
    async findOneContractor(id) {
        const c = await this.contractorsRepo.findOne({ where: { id } });
        if (!c)
            throw new common_1.NotFoundException('Contractor not found');
        return c;
    }
    createContractor(dto) {
        return this.contractorsRepo.save(this.contractorsRepo.create(dto));
    }
    async updateContractor(id, dto) {
        await this.contractorsRepo.update(id, dto);
        return this.findOneContractor(id);
    }
    findAttendance(filters) {
        const query = this.attendanceRepo.createQueryBuilder('a')
            .leftJoinAndSelect('a.contractor', 'contractor')
            .orderBy('a.attendance_date', 'DESC');
        if (filters.project_id)
            query.andWhere('a.project_id = :pid', { pid: filters.project_id });
        if (filters.contractor_id)
            query.andWhere('a.contractor_id = :cid', { cid: filters.contractor_id });
        return query.getMany();
    }
    createAttendance(dto) {
        return this.attendanceRepo.save(this.attendanceRepo.create(dto));
    }
    async calculateWages(project_id, contractor_id) {
        const query = this.attendanceRepo.createQueryBuilder('a')
            .leftJoinAndSelect('a.contractor', 'c')
            .select('a.contractor_id', 'contractor_id')
            .addSelect('c.name', 'contractor_name')
            .addSelect('c.daily_rate', 'daily_rate')
            .addSelect('SUM(CAST(a.present_days AS NUMERIC))', 'total_days')
            .addSelect('SUM(CAST(a.present_days AS NUMERIC) * CAST(COALESCE(c.daily_rate, 0) AS NUMERIC))', 'gross_wages')
            .groupBy('a.contractor_id, c.name, c.daily_rate');
        if (project_id)
            query.andWhere('a.project_id = :pid', { pid: project_id });
        if (contractor_id)
            query.andWhere('a.contractor_id = :cid', { cid: contractor_id });
        const wages = await query.getRawMany();
        const payments = await this.paymentsRepo.createQueryBuilder('p')
            .select('p.contractor_id', 'contractor_id')
            .addSelect('SUM(CAST(p.amount AS NUMERIC))', 'total_paid')
            .groupBy('p.contractor_id')
            .where(project_id ? 'p.project_id = :pid' : '1=1', project_id ? { pid: project_id } : {})
            .getRawMany();
        const paidMap = {};
        payments.forEach((p) => { paidMap[p.contractor_id] = Number(p.total_paid); });
        const advances = await this.advancesRepo.createQueryBuilder('adv')
            .select('adv.contractor_id', 'contractor_id')
            .addSelect('SUM(CAST(adv.amount AS NUMERIC))', 'total_advance')
            .groupBy('adv.contractor_id')
            .where(project_id ? 'adv.project_id = :pid' : '1=1', project_id ? { pid: project_id } : {})
            .getRawMany();
        const advanceMap = {};
        advances.forEach((a) => { advanceMap[a.contractor_id] = Number(a.total_advance); });
        return wages.map((w) => {
            const gross = Number(w.gross_wages);
            const paid = paidMap[w.contractor_id] ?? 0;
            const advance = advanceMap[w.contractor_id] ?? 0;
            return {
                contractor_id: w.contractor_id,
                contractor_name: w.contractor_name,
                daily_rate: Number(w.daily_rate),
                total_days: Number(w.total_days),
                gross_wages: gross,
                total_paid: paid,
                advances_given: advance,
                balance_due: gross - paid - advance,
            };
        });
    }
    findPayments(filters) {
        const query = this.paymentsRepo.createQueryBuilder('p')
            .leftJoinAndSelect('p.contractor', 'contractor')
            .orderBy('p.payment_date', 'DESC');
        if (filters.project_id)
            query.andWhere('p.project_id = :pid', { pid: filters.project_id });
        if (filters.contractor_id)
            query.andWhere('p.contractor_id = :cid', { cid: filters.contractor_id });
        return query.getMany();
    }
    async postPaymentJournal(payment, manager) {
        const contractor = await manager.getRepository(labour_contractor_entity_1.LabourContractor).findOne({
            where: { id: payment.contractor_id },
        });
        await this.accounting.postLabourPaymentJournal({
            id: payment.id,
            contractor_id: payment.contractor_id,
            project_id: payment.project_id,
            payment_date: payment.payment_date,
            amount: payment.amount,
            payment_method: payment.payment_method,
            notes: payment.notes,
            contractor_name: contractor?.name ?? null,
        }, manager);
    }
    async createPayment(dto) {
        if (!dto.contractor_id || !dto.project_id || !dto.payment_date || dto.amount == null) {
            throw new common_1.BadRequestException('contractor_id, project_id, payment_date, and amount are required');
        }
        if (!(Number(dto.amount) > 0))
            throw new common_1.BadRequestException('amount must be positive');
        return this.dataSource.transaction(async (manager) => {
            const repo = manager.getRepository(labour_payment_entity_1.LabourPayment);
            const payment = await repo.save(repo.create({
                ...dto,
                amount: Number(dto.amount).toFixed(2),
                payment_method: dto.payment_method || 'Cash',
            }));
            await this.postPaymentJournal(payment, manager);
            return repo.findOne({ where: { id: payment.id }, relations: ['contractor'] });
        });
    }
    findAdvances(filters) {
        const query = this.advancesRepo.createQueryBuilder('a')
            .leftJoinAndSelect('a.contractor', 'contractor')
            .orderBy('a.advance_date', 'DESC');
        if (filters.project_id)
            query.andWhere('a.project_id = :pid', { pid: filters.project_id });
        if (filters.contractor_id)
            query.andWhere('a.contractor_id = :cid', { cid: filters.contractor_id });
        return query.getMany();
    }
    createAdvance(dto) {
        return this.advancesRepo.save(this.advancesRepo.create(dto));
    }
    async deleteContractor(id) {
        await this.contractorsRepo.delete(id);
        return { deleted: true };
    }
    async updateAttendance(id, dto) {
        await this.attendanceRepo.update(id, dto);
        return this.attendanceRepo.findOne({ where: { id } });
    }
    async deleteAttendance(id) {
        await this.attendanceRepo.delete(id);
        return { deleted: true };
    }
    async updatePayment(id, dto) {
        return this.dataSource.transaction(async (manager) => {
            const repo = manager.getRepository(labour_payment_entity_1.LabourPayment);
            const existing = await repo.findOne({ where: { id } });
            if (!existing)
                throw new common_1.NotFoundException('Payment not found');
            const nextAmount = dto.amount !== undefined ? Number(dto.amount).toFixed(2) : existing.amount;
            if (!(Number(nextAmount) > 0))
                throw new common_1.BadRequestException('amount must be positive');
            await repo.update(id, {
                ...(dto.contractor_id !== undefined ? { contractor_id: dto.contractor_id } : {}),
                ...(dto.project_id !== undefined ? { project_id: dto.project_id } : {}),
                ...(dto.project_stage_id !== undefined
                    ? { project_stage_id: dto.project_stage_id || null }
                    : {}),
                ...(dto.payment_date !== undefined ? { payment_date: dto.payment_date } : {}),
                amount: nextAmount,
                ...(dto.payment_method !== undefined ? { payment_method: dto.payment_method } : {}),
                ...(dto.reference_no !== undefined ? { reference_no: dto.reference_no || null } : {}),
                ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
            });
            const updated = await repo.findOne({ where: { id } });
            if (!updated)
                throw new common_1.NotFoundException('Payment not found');
            await this.accounting.deleteJournalByReference(`LABOUR-${id}`, manager);
            await this.postPaymentJournal(updated, manager);
            return repo.findOne({ where: { id }, relations: ['contractor'] });
        });
    }
    async deletePayment(id) {
        return this.dataSource.transaction(async (manager) => {
            const repo = manager.getRepository(labour_payment_entity_1.LabourPayment);
            const payment = await repo.findOne({ where: { id } });
            if (!payment)
                throw new common_1.NotFoundException('Payment not found');
            await this.accounting.deleteJournalByReference(`LABOUR-${id}`, manager);
            await repo.delete(id);
            return { deleted: true };
        });
    }
};
exports.LabourService = LabourService;
exports.LabourService = LabourService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(labour_contractor_entity_1.LabourContractor)),
    __param(1, (0, typeorm_1.InjectRepository)(labour_attendance_entity_1.LabourAttendance)),
    __param(2, (0, typeorm_1.InjectRepository)(labour_payment_entity_1.LabourPayment)),
    __param(3, (0, typeorm_1.InjectRepository)(labour_advance_entity_1.LabourAdvance)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        accounting_service_1.AccountingService])
], LabourService);
//# sourceMappingURL=labour.service.js.map