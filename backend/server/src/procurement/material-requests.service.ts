import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialRequest } from './entities/material-request.entity';
import { MaterialRequestItem } from './entities/material-request-item.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PoItem } from './entities/po-item.entity';

@Injectable()
export class MaterialRequestsService {
  constructor(
    @InjectRepository(MaterialRequest)
    private readonly mrRepo: Repository<MaterialRequest>,
    @InjectRepository(MaterialRequestItem)
    private readonly itemRepo: Repository<MaterialRequestItem>,
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PoItem)
    private readonly poItemRepo: Repository<PoItem>,
  ) {}

  private async nextRequestNo(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.mrRepo
      .createQueryBuilder('mr')
      .where('mr.request_no LIKE :prefix', { prefix: `MR-${year}-%` })
      .getCount();
    return `MR-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  findAll(filters: { project_id?: string; status?: string }) {
    const q = this.mrRepo.createQueryBuilder('mr').orderBy('mr.request_date', 'DESC');
    if (filters.project_id) q.andWhere('mr.project_id = :pid', { pid: filters.project_id });
    if (filters.status) q.andWhere('mr.status = :status', { status: filters.status });
    return q.getMany();
  }

  async findOne(id: string) {
    const mr = await this.mrRepo.findOne({ where: { id } });
    if (!mr) throw new NotFoundException('Material request not found');
    const items = await this.itemRepo.find({ where: { material_request_id: id } });
    return { ...mr, items };
  }

  async create(dto: {
    request: Partial<MaterialRequest>;
    items: Partial<MaterialRequestItem>[];
  }) {
    if (!dto.request?.project_id) throw new BadRequestException('project_id is required');
    if (!dto.request?.requested_by) throw new BadRequestException('requested_by is required');
    if (!dto.items?.length) throw new BadRequestException('At least one item is required');

    const request_no = await this.nextRequestNo();
    const mr = await this.mrRepo.save(
      this.mrRepo.create({
        ...dto.request,
        request_no,
        request_date: dto.request.request_date || new Date().toISOString().slice(0, 10),
        status: dto.request.status || 'Draft',
        project_stage_id: dto.request.project_stage_id ?? null,
        needed_by_date: dto.request.needed_by_date ?? null,
        notes: dto.request.notes ?? null,
      }),
    );

    for (const item of dto.items) {
      await this.itemRepo.save(
        this.itemRepo.create({
          material_request_id: mr.id,
          material_id: item.material_id ?? null,
          material_name: item.material_name!,
          unit: item.unit || 'pcs',
          quantity_requested: item.quantity_requested!,
          quantity_approved: null,
          estimated_unit_cost: item.estimated_unit_cost ?? null,
          notes: item.notes ?? null,
        }),
      );
    }
    return this.findOne(mr.id);
  }

  async update(id: string, dto: Partial<MaterialRequest>) {
    const mr = await this.findOne(id);
    if (!['Draft', 'Rejected'].includes(mr.status)) {
      throw new BadRequestException('Only Draft or Rejected requests can be edited');
    }
    const { status: _s, purchase_order_id: _p, approved_by: _a, approved_at: _t, ...safe } = dto as any;
    await this.mrRepo.update(id, safe);
    return this.findOne(id);
  }

  async submit(id: string) {
    const mr = await this.findOne(id);
    if (mr.status !== 'Draft' && mr.status !== 'Rejected') {
      throw new BadRequestException('Only Draft or Rejected requests can be submitted');
    }
    if (!mr.items?.length) throw new BadRequestException('Request has no items');
    await this.mrRepo.update(id, { status: 'Submitted', rejection_reason: null });
    return this.findOne(id);
  }

  async approve(id: string, dto: { approved_by: string; items?: { id: string; quantity_approved: string }[] }) {
    const mr = await this.findOne(id);
    if (mr.status !== 'Submitted') {
      throw new BadRequestException('Only Submitted requests can be approved');
    }
    if (!dto.approved_by) throw new BadRequestException('approved_by is required');

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

  async reject(id: string, dto: { approved_by: string; rejection_reason?: string }) {
    const mr = await this.findOne(id);
    if (mr.status !== 'Submitted') {
      throw new BadRequestException('Only Submitted requests can be rejected');
    }
    await this.mrRepo.update(id, {
      status: 'Rejected',
      approved_by: dto.approved_by ?? null,
      approved_at: new Date(),
      rejection_reason: dto.rejection_reason ?? 'Rejected',
    });
    return this.findOne(id);
  }

  async convertToPo(id: string, dto: { supplier_id: string; created_by?: string; order_date?: string; expected_delivery?: string; notes?: string }) {
    const mr = await this.findOne(id);
    if (mr.status !== 'Approved') {
      throw new BadRequestException('Only Approved requests can be converted to a PO');
    }
    if (!dto.supplier_id) throw new BadRequestException('supplier_id is required');

    const items = (mr.items || []).filter((i) => Number(i.quantity_approved ?? i.quantity_requested) > 0);
    if (!items.length) throw new BadRequestException('No approved quantities to convert');

    const po = await this.poRepo.save(
      this.poRepo.create({
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
      }),
    );

    let total = 0;
    for (const item of items) {
      const qty = Number(item.quantity_approved ?? item.quantity_requested);
      const unit_price = Number(item.estimated_unit_cost ?? 0);
      const total_price = qty * unit_price;
      total += total_price;
      await this.poItemRepo.save(
        this.poItemRepo.create({
          purchase_order_id: po.id,
          material_id: item.material_id,
          material_request_item_id: item.id,
          material_name: item.material_name,
          unit: item.unit,
          quantity: qty.toString(),
          unit_price: unit_price.toFixed(2),
          total_price: total_price.toFixed(2),
          received_qty: '0',
        }),
      );
    }
    await this.poRepo.update(po.id, { total_amount: total.toFixed(2) });
    await this.mrRepo.update(id, { status: 'Converted', purchase_order_id: po.id });
    return this.findOne(id);
  }
}
