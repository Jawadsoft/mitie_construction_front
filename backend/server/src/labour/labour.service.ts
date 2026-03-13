import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LabourContractor } from './entities/labour-contractor.entity';
import { LabourAttendance } from './entities/labour-attendance.entity';
import { LabourPayment } from './entities/labour-payment.entity';
import { LabourAdvance } from './entities/labour-advance.entity';

@Injectable()
export class LabourService {
  constructor(
    @InjectRepository(LabourContractor) private readonly contractorsRepo: Repository<LabourContractor>,
    @InjectRepository(LabourAttendance) private readonly attendanceRepo: Repository<LabourAttendance>,
    @InjectRepository(LabourPayment) private readonly paymentsRepo: Repository<LabourPayment>,
    @InjectRepository(LabourAdvance) private readonly advancesRepo: Repository<LabourAdvance>,
  ) {}

  findAllContractors() { return this.contractorsRepo.find({ order: { name: 'ASC' } }); }

  async findOneContractor(id: string) {
    const c = await this.contractorsRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Contractor not found');
    return c;
  }

  createContractor(dto: Partial<LabourContractor>) {
    return this.contractorsRepo.save(this.contractorsRepo.create(dto));
  }

  async updateContractor(id: string, dto: Partial<LabourContractor>) {
    await this.contractorsRepo.update(id, dto);
    return this.findOneContractor(id);
  }

  findAttendance(filters: { project_id?: string; contractor_id?: string }) {
    const query = this.attendanceRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.contractor', 'contractor')
      .orderBy('a.attendance_date', 'DESC');
    if (filters.project_id) query.andWhere('a.project_id = :pid', { pid: filters.project_id });
    if (filters.contractor_id) query.andWhere('a.contractor_id = :cid', { cid: filters.contractor_id });
    return query.getMany();
  }

  createAttendance(dto: Partial<LabourAttendance>) {
    return this.attendanceRepo.save(this.attendanceRepo.create(dto));
  }

  // Auto-calculate wages from attendance × daily_rate
  async calculateWages(project_id?: string, contractor_id?: string) {
    const query = this.attendanceRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.contractor', 'c')
      .select('a.contractor_id', 'contractor_id')
      .addSelect('c.name', 'contractor_name')
      .addSelect('c.daily_rate', 'daily_rate')
      .addSelect('SUM(CAST(a.present_days AS NUMERIC))', 'total_days')
      .addSelect('SUM(CAST(a.present_days AS NUMERIC) * CAST(COALESCE(c.daily_rate, 0) AS NUMERIC))', 'gross_wages')
      .groupBy('a.contractor_id, c.name, c.daily_rate');
    if (project_id) query.andWhere('a.project_id = :pid', { pid: project_id });
    if (contractor_id) query.andWhere('a.contractor_id = :cid', { cid: contractor_id });
    const wages = await query.getRawMany();

    // Get total payments made
    const payments = await this.paymentsRepo.createQueryBuilder('p')
      .select('p.contractor_id', 'contractor_id')
      .addSelect('SUM(CAST(p.amount AS NUMERIC))', 'total_paid')
      .groupBy('p.contractor_id')
      .where(project_id ? 'p.project_id = :pid' : '1=1', project_id ? { pid: project_id } : {})
      .getRawMany();

    const paidMap: Record<string, number> = {};
    payments.forEach((p: any) => { paidMap[p.contractor_id] = Number(p.total_paid); });

    // Get advances
    const advances = await this.advancesRepo.createQueryBuilder('adv')
      .select('adv.contractor_id', 'contractor_id')
      .addSelect('SUM(CAST(adv.amount AS NUMERIC))', 'total_advance')
      .groupBy('adv.contractor_id')
      .where(project_id ? 'adv.project_id = :pid' : '1=1', project_id ? { pid: project_id } : {})
      .getRawMany();

    const advanceMap: Record<string, number> = {};
    advances.forEach((a: any) => { advanceMap[a.contractor_id] = Number(a.total_advance); });

    return wages.map((w: any) => {
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

  findPayments(filters: { project_id?: string; contractor_id?: string }) {
    const query = this.paymentsRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.contractor', 'contractor')
      .orderBy('p.payment_date', 'DESC');
    if (filters.project_id) query.andWhere('p.project_id = :pid', { pid: filters.project_id });
    if (filters.contractor_id) query.andWhere('p.contractor_id = :cid', { cid: filters.contractor_id });
    return query.getMany();
  }

  createPayment(dto: Partial<LabourPayment>) {
    return this.paymentsRepo.save(this.paymentsRepo.create(dto));
  }

  findAdvances(filters: { project_id?: string; contractor_id?: string }) {
    const query = this.advancesRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.contractor', 'contractor')
      .orderBy('a.advance_date', 'DESC');
    if (filters.project_id) query.andWhere('a.project_id = :pid', { pid: filters.project_id });
    if (filters.contractor_id) query.andWhere('a.contractor_id = :cid', { cid: filters.contractor_id });
    return query.getMany();
  }

  createAdvance(dto: Partial<LabourAdvance>) {
    return this.advancesRepo.save(this.advancesRepo.create(dto));
  }

  async deleteContractor(id: string) {
    await this.contractorsRepo.delete(id);
    return { deleted: true };
  }

  async updateAttendance(id: string, dto: Partial<LabourAttendance>) {
    await this.attendanceRepo.update(id, dto);
    return this.attendanceRepo.findOne({ where: { id } });
  }

  async deleteAttendance(id: string) {
    await this.attendanceRepo.delete(id);
    return { deleted: true };
  }

  async updatePayment(id: string, dto: Partial<LabourPayment>) {
    await this.paymentsRepo.update(id, dto);
    return this.paymentsRepo.findOne({ where: { id } });
  }

  async deletePayment(id: string) {
    await this.paymentsRepo.delete(id);
    return { deleted: true };
  }
}
