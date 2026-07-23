import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { PropertyUnit } from './entities/property-unit.entity';
import { Sale } from './entities/sale.entity';
import { SaleInstallment } from './entities/sale-installment.entity';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Customer) private readonly custRepo: Repository<Customer>,
    @InjectRepository(PropertyUnit) private readonly unitRepo: Repository<PropertyUnit>,
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleInstallment) private readonly installRepo: Repository<SaleInstallment>,
    private readonly dataSource: DataSource,
    private readonly accounting: AccountingService,
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
    return this.dataSource.transaction(async (manager) => {
      const saleRepo = manager.getRepository(Sale);
      const installRepo = manager.getRepository(SaleInstallment);
      const unitRepo = manager.getRepository(PropertyUnit);

      const sale = await saleRepo.save(saleRepo.create(dto.sale));
      if (dto.installments?.length) {
        for (const inst of dto.installments) {
          await installRepo.save(installRepo.create({ ...inst, sale_id: sale.id }));
        }
      }
      await unitRepo.update(sale.property_unit_id, { status: 'Sold' });

      const unit = await unitRepo.findOne({ where: { id: sale.property_unit_id } });
      await this.accounting.postSaleJournal(sale, unit?.project_id ?? null, manager);

      const full = await saleRepo.findOne({
        where: { id: sale.id },
        relations: ['customer', 'property_unit'],
      });
      const installments = await installRepo.find({
        where: { sale_id: sale.id },
        order: { due_date: 'ASC' },
      });
      return { ...full!, installments };
    });
  }

  async recordPayment(installment_id: string, paid_amount: string, paid_date: string) {
    return this.dataSource.transaction(async (manager) => {
      const installRepo = manager.getRepository(SaleInstallment);
      const saleRepo = manager.getRepository(Sale);
      const unitRepo = manager.getRepository(PropertyUnit);

      const inst = await installRepo.findOne({ where: { id: installment_id } });
      if (!inst) throw new NotFoundException('Installment not found');

      const newPaid = Number(inst.paid_amount) + Number(paid_amount);
      const status = newPaid >= Number(inst.due_amount) ? 'Paid' : 'Partial';
      await installRepo.update(installment_id, {
        paid_amount: newPaid.toString(),
        status,
        paid_date,
      });

      const sale = await saleRepo.findOne({ where: { id: inst.sale_id } });
      if (!sale) throw new NotFoundException('Sale not found');

      const totalPaid = (Number(sale.total_paid) + Number(paid_amount)).toFixed(2);
      await saleRepo.update(sale.id, { total_paid: totalPaid });

      const unit = await unitRepo.findOne({ where: { id: sale.property_unit_id } });
      await this.accounting.postSalePaymentJournal(
        sale,
        paid_amount,
        {
          installment_id,
          paid_date,
          project_id: unit?.project_id ?? null,
        },
        manager,
      );

      return installRepo.findOne({ where: { id: installment_id } });
    });
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
    return this.dataSource.transaction(async (manager) => {
      const saleRepo = manager.getRepository(Sale);
      const installRepo = manager.getRepository(SaleInstallment);
      const sale = await saleRepo.findOne({ where: { id } });
      if (!sale) throw new NotFoundException('Sale not found');
      const installments = await installRepo.find({ where: { sale_id: id } });
      for (const inst of installments) {
        await this.accounting.deleteJournalByReference(`PMT-${inst.id}`, manager);
      }
      await this.accounting.deleteJournalByReference(`SALE-${id}`, manager);
      await installRepo.delete({ sale_id: id });
      await saleRepo.delete(id);
      return { deleted: true };
    });
  }
}
