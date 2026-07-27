import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { LandParcel } from '../land/entities/land-parcel.entity';
import { Customer } from '../sales/entities/customer.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';

const LIMIT = 8;

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(LandParcel) private readonly land: Repository<LandParcel>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Sale) private readonly sales: Repository<Sale>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
  ) {}

  async search(q: string) {
    const like = `%${q}%`;

    const [projects, land, customers, sales, expenses, suppliers] = await Promise.all([
      this.projects.find({
        where: [{ name: ILike(like) }, { location: ILike(like) }],
        take: LIMIT,
        order: { id: 'DESC' },
      }),
      this.land.find({
        where: [
          { plot_number: ILike(like) },
          { owner_name: ILike(like) },
          { location: ILike(like) },
        ],
        take: LIMIT,
        order: { id: 'DESC' },
      }),
      this.customers.find({
        where: [{ name: ILike(like) }, { phone: ILike(like) }],
        take: LIMIT,
        order: { id: 'DESC' },
      }),
      this.sales
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.customer', 'c')
        .leftJoinAndSelect('s.property_unit', 'u')
        .where('CAST(s.id AS text) ILIKE :like', { like })
        .orWhere('c.name ILIKE :like', { like })
        .orWhere('u.unit_number ILIKE :like', { like })
        .orderBy('s.id', 'DESC')
        .take(LIMIT)
        .getMany(),
      this.expenses.find({
        where: [{ description: ILike(like) }, { category: ILike(like) }],
        take: LIMIT,
        order: { id: 'DESC' },
      }),
      this.suppliers.find({
        where: [{ name: ILike(like) }],
        take: LIMIT,
        order: { id: 'DESC' },
      }),
    ]);

    return {
      projects: projects.map((p) => ({
        id: p.id,
        label: p.name,
        sub: p.location || p.status,
      })),
      land: land.map((l) => ({
        id: l.id,
        label: `Plot ${l.plot_number}`,
        sub: [l.owner_name, l.location].filter(Boolean).join(' · '),
      })),
      customers: customers.map((c) => ({
        id: c.id,
        label: c.name,
        sub: c.phone || c.email || '',
      })),
      sales: sales.map((s) => ({
        id: s.id,
        label: `Sale #${s.id}`,
        sub: [s.customer?.name, s.property_unit?.unit_number ? `Unit ${s.property_unit.unit_number}` : '']
          .filter(Boolean)
          .join(' · '),
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        label: e.category,
        sub: [e.description, e.expense_date, `PKR ${Number(e.amount).toLocaleString()}`]
          .filter(Boolean)
          .join(' · '),
      })),
      suppliers: suppliers.map((s) => ({
        id: s.id,
        label: s.name,
        sub: s.phone || s.category || '',
      })),
    };
  }
}
