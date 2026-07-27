import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { PropertyUnit } from './entities/property-unit.entity';
import { Sale } from './entities/sale.entity';
import { SaleInstallment } from './entities/sale-installment.entity';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Customer) private readonly custRepo: Repository<Customer>,
    @InjectRepository(PropertyUnit)
    private readonly unitRepo: Repository<PropertyUnit>,
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleInstallment)
    private readonly installRepo: Repository<SaleInstallment>,
    private readonly dataSource: DataSource,
    private readonly accounting: AccountingService,
  ) {}

  findCustomers() {
    return this.custRepo.find({ order: { name: 'ASC' } });
  }
  createCustomer(dto: Partial<Customer>) {
    return this.custRepo.save(this.custRepo.create(dto));
  }

  findUnits(project_id?: string, status?: string) {
    const q = this.unitRepo
      .createQueryBuilder('u')
      .orderBy('u.unit_number', 'ASC');
    if (project_id) q.andWhere('u.project_id = :pid', { pid: project_id });
    if (status) q.andWhere('u.status = :status', { status });
    return q.getMany();
  }

  createUnit(dto: Partial<PropertyUnit>) {
    return this.unitRepo.save(this.unitRepo.create(dto));
  }

  async updateUnit(id: string, dto: Partial<PropertyUnit>) {
    await this.unitRepo.update(id, dto);
    return this.unitRepo.findOne({ where: { id } });
  }

  async findSales(project_id?: string, customer_id?: string) {
    const q = this.saleRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.customer', 'customer')
      .leftJoinAndSelect('s.property_unit', 'property_unit')
      .orderBy('s.sale_date', 'DESC');
    if (project_id)
      q.andWhere('property_unit.project_id = :pid', { pid: project_id });
    if (customer_id) q.andWhere('s.customer_id = :cid', { cid: customer_id });
    return q.getMany();
  }

  async findOneSale(id: string) {
    const sale = await this.saleRepo.findOne({
      where: { id },
      relations: ['customer', 'property_unit'],
    });
    if (!sale) throw new NotFoundException('Sale not found');
    const installments = await this.installRepo.find({
      where: { sale_id: id },
      order: { due_date: 'ASC' },
    });
    return { ...sale, installments };
  }

  async createSale(dto: {
    sale: Partial<Sale>;
    installments?: Partial<SaleInstallment>[];
  }) {
    return this.dataSource.transaction(async (manager) => {
      const saleRepo = manager.getRepository(Sale);
      const installRepo = manager.getRepository(SaleInstallment);
      const unitRepo = manager.getRepository(PropertyUnit);

      const sale = await saleRepo.save(saleRepo.create(dto.sale));
      const installmentsIn =
        dto.installments?.filter(
          (inst) => inst.due_date && inst.due_amount != null && Number(inst.due_amount) > 0,
        ) ?? [];
      if (installmentsIn.length) {
        for (const inst of installmentsIn) {
          await installRepo.save(
            installRepo.create({ ...inst, sale_id: sale.id, status: inst.status || 'Pending' }),
          );
        }
      } else {
        // Auto-create one installment for the full price so Collections always has a row
        await installRepo.save(
          installRepo.create({
            sale_id: sale.id,
            due_date: sale.sale_date,
            due_amount: sale.total_sale_price,
            paid_amount: '0.00',
            status: 'Pending',
            notes: 'Full sale amount',
          }),
        );
      }
      await unitRepo.update(sale.property_unit_id, { status: 'Sold' });

      const unit = await unitRepo.findOne({
        where: { id: sale.property_unit_id },
      });

      if (unit?.project_id) {
        const remainingAvailable = await unitRepo.count({
          where: { project_id: unit.project_id, status: 'Available' },
        });
        if (remainingAvailable === 0) {
          await manager.query(
            `UPDATE projects
             SET status = 'Sold', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
               AND status NOT IN ('Cancelled', 'Sold During Construction', 'Sold')`,
            [unit.project_id],
          );
        }
      }

      await this.accounting.postSaleJournal(
        sale,
        unit?.project_id ?? null,
        manager,
      );

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

  /**
   * Apply a payment slice to one installment and bump sale.total_paid + PMT JE.
   */
  private async applyInstallmentPayment(
    manager: EntityManager,
    installment_id: string,
    paid_amount: number,
    paid_date: string,
    bank_account_id?: string | null,
  ) {
    if (!(paid_amount > 0)) return;
    const installRepo = manager.getRepository(SaleInstallment);
    const saleRepo = manager.getRepository(Sale);
    const unitRepo = manager.getRepository(PropertyUnit);

    const inst = await installRepo.findOne({ where: { id: installment_id } });
    if (!inst) throw new NotFoundException('Installment not found');

    const newPaid = Number(inst.paid_amount) + paid_amount;
    const status = newPaid >= Number(inst.due_amount) - 0.009 ? 'Paid' : 'Partial';
    await installRepo.update(installment_id, {
      paid_amount: newPaid.toFixed(2),
      status,
      paid_date,
      ...(bank_account_id !== undefined
        ? { bank_account_id: bank_account_id || null }
        : {}),
    });

    const sale = await saleRepo.findOne({ where: { id: inst.sale_id } });
    if (!sale) throw new NotFoundException('Sale not found');

    const totalPaid = (Number(sale.total_paid) + paid_amount).toFixed(2);
    const fullyPaid =
      Number(totalPaid) >= Number(sale.total_sale_price) - 0.009;
    await saleRepo.update(sale.id, {
      total_paid: totalPaid,
      ...(sale.status !== 'Cancelled' && fullyPaid
        ? { status: 'Completed' }
        : {}),
    });

    const unit = await unitRepo.findOne({
      where: { id: sale.property_unit_id },
    });
    await this.accounting.postSalePaymentJournal(
      sale,
      paid_amount.toFixed(2),
      {
        installment_id,
        paid_date,
        project_id: unit?.project_id ?? null,
        bank_account_id: bank_account_id || null,
      },
      manager,
    );
  }

  async recordPayment(
    installment_id: string,
    paid_amount: string,
    paid_date: string,
    bank_account_id?: string | null,
  ) {
    const amount = Number(paid_amount);
    if (!(amount > 0)) {
      throw new BadRequestException('paid_amount must be greater than 0');
    }
    if (!paid_date) {
      throw new BadRequestException('paid_date is required');
    }
    return this.dataSource.transaction(async (manager) => {
      const installRepo = manager.getRepository(SaleInstallment);
      const inst = await installRepo.findOne({ where: { id: installment_id } });
      if (!inst) throw new NotFoundException('Installment not found');
      const balance = Number(inst.due_amount) - Number(inst.paid_amount);
      if (amount > balance + 0.009) {
        throw new BadRequestException(
          `Amount exceeds installment balance (${balance.toFixed(2)})`,
        );
      }
      await this.applyInstallmentPayment(
        manager,
        installment_id,
        amount,
        paid_date,
        bank_account_id,
      );
      return installRepo.findOne({ where: { id: installment_id } });
    });
  }

  /**
   * Full/direct collection: FIFO across open installments; create catch-up
   * installment if needed for remaining sale balance.
   */
  async collectOnSale(
    saleId: string,
    dto: {
      paid_amount: string | number;
      paid_date: string;
      bank_account_id?: string | null;
    },
  ) {
    const amount = Number(dto.paid_amount);
    if (!(amount > 0)) {
      throw new BadRequestException('paid_amount must be greater than 0');
    }
    if (!dto.paid_date) {
      throw new BadRequestException('paid_date is required');
    }

    return this.dataSource.transaction(async (manager) => {
      const saleRepo = manager.getRepository(Sale);
      const installRepo = manager.getRepository(SaleInstallment);

      const sale = await saleRepo.findOne({
        where: { id: saleId },
        relations: ['customer', 'property_unit'],
      });
      if (!sale) throw new NotFoundException('Sale not found');
      if (sale.status === 'Cancelled') {
        throw new BadRequestException('Cannot collect on a cancelled sale');
      }

      const remaining =
        Number(sale.total_sale_price) - Number(sale.total_paid);
      if (remaining <= 0.009) {
        throw new BadRequestException('Sale is already fully paid');
      }
      if (amount > remaining + 0.009) {
        throw new BadRequestException(
          `Amount exceeds sale balance due (${remaining.toFixed(2)})`,
        );
      }

      let left = Math.round(amount * 100) / 100;
      const installments = await installRepo.find({
        where: { sale_id: saleId },
        order: { due_date: 'ASC', id: 'ASC' },
      });

      for (const inst of installments) {
        if (left <= 0.009) break;
        if (inst.status === 'Paid') continue;
        const bal =
          Math.round(
            (Number(inst.due_amount) - Number(inst.paid_amount)) * 100,
          ) / 100;
        if (bal <= 0.009) continue;
        const slice = Math.min(left, bal);
        await this.applyInstallmentPayment(
          manager,
          inst.id,
          slice,
          dto.paid_date,
          dto.bank_account_id,
        );
        left = Math.round((left - slice) * 100) / 100;
      }

      if (left > 0.009) {
        const refreshed = await saleRepo.findOne({ where: { id: saleId } });
        const stillDue = refreshed
          ? Number(refreshed.total_sale_price) - Number(refreshed.total_paid)
          : 0;
        const catchUp = Math.min(left, Math.round(stillDue * 100) / 100);
        if (catchUp > 0.009) {
          const created = await installRepo.save(
            installRepo.create({
              sale_id: saleId,
              due_date: dto.paid_date,
              due_amount: catchUp.toFixed(2),
              paid_amount: '0.00',
              paid_date: null,
              status: 'Pending',
              notes: 'Catch-up for full/direct collection',
            }),
          );
          await this.applyInstallmentPayment(
            manager,
            created.id,
            catchUp,
            dto.paid_date,
            dto.bank_account_id,
          );
          left = Math.round((left - catchUp) * 100) / 100;
        }
      }

      if (left > 0.009) {
        throw new BadRequestException(
          'Could not allocate full collection amount to installments',
        );
      }

      const full = await saleRepo.findOne({
        where: { id: saleId },
        relations: ['customer', 'property_unit'],
      });
      const updatedInstallments = await installRepo.find({
        where: { sale_id: saleId },
        order: { due_date: 'ASC' },
      });
      return { ...full!, installments: updatedInstallments };
    });
  }

  /**
   * Edit total collected on a sale: clears prior payment journals/installment
   * payments, then re-applies the new collected amount (FIFO).
   */
  async adjustSaleCollection(
    saleId: string,
    dto: {
      total_collected: string | number;
      paid_date: string;
      bank_account_id?: string | null;
    },
  ) {
    const target = Math.round(Number(dto.total_collected) * 100) / 100;
    if (!Number.isFinite(target) || target < 0) {
      throw new BadRequestException('total_collected must be a non-negative number');
    }
    if (!dto.paid_date) {
      throw new BadRequestException('paid_date is required');
    }

    return this.dataSource.transaction(async (manager) => {
      const saleRepo = manager.getRepository(Sale);
      const installRepo = manager.getRepository(SaleInstallment);

      const sale = await saleRepo.findOne({ where: { id: saleId } });
      if (!sale) throw new NotFoundException('Sale not found');
      if (sale.status === 'Cancelled') {
        throw new BadRequestException('Cannot edit collection on a cancelled sale');
      }

      const price = Number(sale.total_sale_price);
      if (target > price + 0.009) {
        throw new BadRequestException(
          `Collected amount cannot exceed sale price (${price.toFixed(2)})`,
        );
      }

      const installments = await installRepo.find({ where: { sale_id: saleId } });
      for (const inst of installments) {
        await this.accounting.deleteJournalsByReferencePrefix(
          `PMT-${inst.id}`,
          manager,
        );
      }

      for (const inst of installments) {
        if (inst.notes && /catch-up/i.test(inst.notes)) {
          await installRepo.delete(inst.id);
        } else {
          await installRepo.update(inst.id, {
            paid_amount: '0.00',
            paid_date: null,
            status: 'Pending',
            bank_account_id: null,
          });
        }
      }

      await saleRepo.update(saleId, {
        total_paid: '0.00',
        status: sale.status === 'Completed' ? 'Active' : sale.status,
      });

      if (target > 0.009) {
        let left = target;
        const openInst = await installRepo.find({
          where: { sale_id: saleId },
          order: { due_date: 'ASC', id: 'ASC' },
        });

        for (const inst of openInst) {
          if (left <= 0.009) break;
          const bal =
            Math.round((Number(inst.due_amount) - Number(inst.paid_amount)) * 100) /
            100;
          if (bal <= 0.009) continue;
          const slice = Math.min(left, bal);
          await this.applyInstallmentPayment(
            manager,
            inst.id,
            slice,
            dto.paid_date,
            dto.bank_account_id,
          );
          left = Math.round((left - slice) * 100) / 100;
        }

        if (left > 0.009) {
          const created = await installRepo.save(
            installRepo.create({
              sale_id: saleId,
              due_date: dto.paid_date,
              due_amount: left.toFixed(2),
              paid_amount: '0.00',
              paid_date: null,
              status: 'Pending',
              notes: 'Catch-up for full/direct collection',
            }),
          );
          await this.applyInstallmentPayment(
            manager,
            created.id,
            left,
            dto.paid_date,
            dto.bank_account_id,
          );
        }
      }

      const full = await saleRepo.findOne({
        where: { id: saleId },
        relations: ['customer', 'property_unit'],
      });
      const updatedInstallments = await installRepo.find({
        where: { sale_id: saleId },
        order: { due_date: 'ASC' },
      });
      return { ...full!, installments: updatedInstallments };
    });
  }

  findInstallments(sale_id?: string, status?: string) {
    const q = this.installRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.sale', 'sale')
      .orderBy('i.due_date', 'ASC');
    if (sale_id) q.andWhere('i.sale_id = :sid', { sid: sale_id });
    if (status) q.andWhere('i.status = :status', { status });
    return q.getMany();
  }

  /**
   * Set deposit bank on a collected installment and rebuild its PMT journal
   * onto that Cash & Bank sub-account (not parent 1000).
   */
  async setInstallmentBank(installment_id: string, bank_account_id: string | null) {
    return this.dataSource.transaction(async (manager) => {
      const installRepo = manager.getRepository(SaleInstallment);
      const saleRepo = manager.getRepository(Sale);
      const unitRepo = manager.getRepository(PropertyUnit);

      const inst = await installRepo.findOne({ where: { id: installment_id } });
      if (!inst) throw new NotFoundException('Installment not found');

      await installRepo.update(installment_id, {
        bank_account_id: bank_account_id || null,
      });

      const paid = Number(inst.paid_amount || 0);
      await this.accounting.deleteJournalsByReferencePrefix(
        `PMT-${installment_id}`,
        manager,
      );

      if (paid > 0.009) {
        const sale = await saleRepo.findOne({ where: { id: inst.sale_id } });
        if (!sale) throw new NotFoundException('Sale not found');
        const unit = await unitRepo.findOne({
          where: { id: sale.property_unit_id },
        });
        await this.accounting.postSalePaymentJournal(
          sale,
          paid.toFixed(2),
          {
            installment_id,
            paid_date: inst.paid_date || sale.sale_date,
            project_id: unit?.project_id ?? null,
            bank_account_id: bank_account_id || null,
            reference_no: `PMT-${installment_id}`,
          },
          manager,
        );
      }

      return installRepo.findOne({ where: { id: installment_id } });
    });
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

  async updateSale(id: string, dto: Partial<Sale>) {
    return this.dataSource.transaction(async (manager) => {
      const saleRepo = manager.getRepository(Sale);
      const unitRepo = manager.getRepository(PropertyUnit);
      const sale = await saleRepo.findOne({ where: { id } });
      if (!sale) throw new NotFoundException('Sale not found');

      const nextPrice =
        dto.total_sale_price !== undefined
          ? Number(dto.total_sale_price).toFixed(2)
          : sale.total_sale_price;
      if (!(Number(nextPrice) > 0)) {
        throw new BadRequestException('total_sale_price must be positive');
      }
      if (Number(nextPrice) + 0.009 < Number(sale.total_paid)) {
        throw new BadRequestException(
          `Sale price cannot be less than already collected (PKR ${Number(sale.total_paid).toFixed(2)})`,
        );
      }

      const patch: Partial<Sale> = {};
      if (dto.sale_date !== undefined) patch.sale_date = dto.sale_date;
      if (dto.total_sale_price !== undefined) patch.total_sale_price = nextPrice;
      if (dto.notes !== undefined) patch.notes = dto.notes || null;
      if (dto.customer_id !== undefined) patch.customer_id = dto.customer_id;
      if (dto.status !== undefined && ['Active', 'Cancelled', 'Completed'].includes(dto.status)) {
        patch.status = dto.status;
      }
      if (Object.keys(patch).length) {
        await saleRepo.update(id, patch);
      }

      const updated = await saleRepo.findOne({ where: { id } });
      if (!updated) throw new NotFoundException('Sale not found');

      // Keep SALE-* in sync with price/date/notes/project
      const unit = await unitRepo.findOne({ where: { id: updated.property_unit_id } });
      await this.accounting.deleteJournalByReference(`SALE-${id}`, manager);
      if (updated.status !== 'Cancelled') {
        await this.accounting.postSaleJournal(updated, unit?.project_id ?? null, manager);
      }

      return saleRepo.findOne({
        where: { id },
        relations: ['customer', 'property_unit'],
      });
    });
  }

  async deleteSale(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const saleRepo = manager.getRepository(Sale);
      const installRepo = manager.getRepository(SaleInstallment);
      const sale = await saleRepo.findOne({ where: { id } });
      if (!sale) throw new NotFoundException('Sale not found');
      const installments = await installRepo.find({ where: { sale_id: id } });
      for (const inst of installments) {
        await this.accounting.deleteJournalsByReferencePrefix(
          `PMT-${inst.id}`,
          manager,
        );
      }
      await this.accounting.deleteJournalByReference(`SALE-${id}`, manager);
      await installRepo.delete({ sale_id: id });
      await saleRepo.delete(id);
      return { deleted: true };
    });
  }
}
