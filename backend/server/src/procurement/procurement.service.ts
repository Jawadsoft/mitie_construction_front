import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PoItem } from './entities/po-item.entity';
import { MaterialReceipt } from './entities/material-receipt.entity';

@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(PurchaseOrder) private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PoItem) private readonly itemRepo: Repository<PoItem>,
    @InjectRepository(MaterialReceipt) private readonly receiptRepo: Repository<MaterialReceipt>,
  ) {}

  findAll(filters: { project_id?: string; status?: string; supplier_id?: string }) {
    const q = this.poRepo.createQueryBuilder('po').orderBy('po.order_date', 'DESC');
    if (filters.project_id) q.andWhere('po.project_id = :pid', { pid: filters.project_id });
    if (filters.status) q.andWhere('po.status = :status', { status: filters.status });
    if (filters.supplier_id) q.andWhere('po.supplier_id = :sid', { sid: filters.supplier_id });
    return q.getMany();
  }

  async findOne(id: string) {
    const po = await this.poRepo.findOne({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    const items = await this.itemRepo.find({ where: { purchase_order_id: id } });
    const receipts = await this.receiptRepo.find({ where: { purchase_order_id: id }, order: { receipt_date: 'DESC' } });
    return { ...po, items, receipts };
  }

  async create(dto: { order: Partial<PurchaseOrder>; items: Partial<PoItem>[] }) {
    const po = await this.poRepo.save(this.poRepo.create(dto.order));
    const savedItems: PoItem[] = [];
    for (const item of dto.items || []) {
      const saved = await this.itemRepo.save(this.itemRepo.create({ ...item, purchase_order_id: po.id }));
      savedItems.push(saved);
    }
    const total = savedItems.reduce((sum, i) => sum + Number(i.total_price), 0);
    await this.poRepo.update(po.id, { total_amount: total.toString() });
    return this.findOne(po.id);
  }

  async update(id: string, dto: Partial<PurchaseOrder>) {
    await this.findOne(id);
    await this.poRepo.update(id, dto);
    return this.findOne(id);
  }

  async createReceipt(purchase_order_id: string, dto: { receipt_date: string; notes?: string }) {
    const po = await this.poRepo.findOne({ where: { id: purchase_order_id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    const receipt = await this.receiptRepo.save(
      this.receiptRepo.create({ purchase_order_id, receipt_date: dto.receipt_date, notes: dto.notes ?? null, status: 'Received' }),
    );
    await this.poRepo.update(purchase_order_id, { status: 'Received' });
    return receipt;
  }

  getReceipts(purchase_order_id?: string) {
    const q = this.receiptRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.purchase_order', 'po')
      .orderBy('r.receipt_date', 'DESC');
    if (purchase_order_id) q.andWhere('r.purchase_order_id = :id', { id: purchase_order_id });
    return q.getMany();
  }

  async remove(id: string) {
    await this.itemRepo.delete({ purchase_order_id: id });
    await this.receiptRepo.delete({ purchase_order_id: id });
    await this.poRepo.delete(id);
    return { deleted: true };
  }
}
