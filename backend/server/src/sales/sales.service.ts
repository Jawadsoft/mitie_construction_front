import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { PropertyUnit } from './entities/property-unit.entity';
import { Sale } from './entities/sale.entity';
import { SaleInstallment } from './entities/sale-installment.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Customer) private readonly custRepo: Repository<Customer>,
    @InjectRepository(PropertyUnit) private readonly unitRepo: Repository<PropertyUnit>,
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleInstallment) private readonly installRepo: Repository<SaleInstallment>,
  ) {}

  findCustomers() { return this.custRepo.find({ order: { name: 'ASC' } }); }
  createCustomer(dto: Partial<Customer>) { return this.custRepo.save(this.custRepo.create(dto)); }

  findUnits(project_id?: string, status?: string) {
    const q = this.unitRepo.createQueryBuilder('u').orderBy('u.unit_number', 'ASC');
    if (project_id) q.andWhere('u.project_id = :pid', { pid: project_id });
    if (status) q.andWhere('u.status = :status', { status });
    return q.getMany();
  }

  createUnit(dto: Partial<PropertyUnit>) { return this.unitRepo.save(this.unitRepo.create(dto)); }

  async updateUnit(id: string, dto: Partial<PropertyUnit>) {
    await this.unitRepo.update(id, dto);
    return this.unitRepo.findOne({ where: { id } });
  }

  async findSales(project_id?: string, customer_id?: string) {
    const q = this.saleRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.customer', 'customer')
      .leftJoinAndSelect('s.property_unit', 'property_unit')
      .orderBy('s.sale_date', 'DESC');
    if (project_id) q.andWhere('s.property_unit.project_id = :pid', { pid: project_id });
    if (customer_id) q.andWhere('s.customer_id = :cid', { cid: customer_id });
    return q.getMany();
  }

  async findOneSale(id: string) {
    const sale = await this.saleRepo.findOne({ where: { id }, relations: ['customer', 'property_unit'] });
    if (!sale) throw new NotFoundException('Sale not found');
    const installments = await this.installRepo.find({ where: { sale_id: id }, order: { due_date: 'ASC' } });
    return { ...sale, installments };
  }

  async createSale(dto: { sale: Partial<Sale>; installments?: Partial<SaleInstallment>[] }) {
    const sale = await this.saleRepo.save(this.saleRepo.create(dto.sale));
    if (dto.installments?.length) {
      for (const inst of dto.installments) {
        await this.installRepo.save(this.installRepo.create({ ...inst, sale_id: sale.id }));
      }
    }
    await this.unitRepo.update(sale.property_unit_id, { status: 'Sold' });
    return this.findOneSale(sale.id);
  }

  async recordPayment(installment_id: string, paid_amount: string, paid_date: string) {
    const inst = await this.installRepo.findOne({ where: { id: installment_id } });
    if (!inst) throw new NotFoundException('Installment not found');
    const newPaid = Number(inst.paid_amount) + Number(paid_amount);
    const status = newPaid >= Number(inst.due_amount) ? 'Paid' : 'Partial';
    await this.installRepo.update(installment_id, { paid_amount: newPaid.toString(), status, paid_date });
    await this.saleRepo.query(
      `UPDATE sales SET total_paid = total_paid + ? WHERE id = ?`,
      [paid_amount, inst.sale_id]
    );
    return this.installRepo.findOne({ where: { id: installment_id } });
  }

  findInstallments(sale_id?: string, status?: string) {
    const q = this.installRepo.createQueryBuilder('i').leftJoinAndSelect('i.sale', 'sale').orderBy('i.due_date', 'ASC');
    if (sale_id) q.andWhere('i.sale_id = :sid', { sid: sale_id });
    if (status) q.andWhere('i.status = :status', { status });
    return q.getMany();
  }

  async updateCustomer(id: string, dto: Partial<Customer>) {
    await this.custRepo.update(id, dto);
    return this.custRepo.findOne({ where: { id } });
  }

  async deleteCustomer(id: string) {
    await this.custRepo.delete(id);
    return { deleted: true };
  }

  async deleteUnit(id: string) {
    await this.unitRepo.delete(id);
    return { deleted: true };
  }

  async updateSale(id: string, dto: any) {
    await this.saleRepo.update(id, dto);
    return this.saleRepo.findOne({ where: { id } });
  }

  async deleteSale(id: string) {
    await this.installRepo.delete({ sale_id: id });
    await this.saleRepo.delete(id);
    return { deleted: true };
  }
}
