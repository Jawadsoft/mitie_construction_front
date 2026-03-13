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
let LabourService = class LabourService {
    contractorsRepo;
    attendanceRepo;
    paymentsRepo;
    advancesRepo;
    constructor(contractorsRepo, attendanceRepo, paymentsRepo, advancesRepo) {
        this.contractorsRepo = contractorsRepo;
        this.attendanceRepo = attendanceRepo;
        this.paymentsRepo = paymentsRepo;
        this.advancesRepo = advancesRepo;
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
    createPayment(dto) {
        return this.paymentsRepo.save(this.paymentsRepo.create(dto));
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
        await this.paymentsRepo.update(id, dto);
        return this.paymentsRepo.findOne({ where: { id } });
    }
    async deletePayment(id) {
        await this.paymentsRepo.delete(id);
        return { deleted: true };
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
        typeorm_2.Repository])
], LabourService);
//# sourceMappingURL=labour.service.js.map