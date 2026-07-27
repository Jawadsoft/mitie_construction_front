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
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const project_entity_1 = require("../projects/entities/project.entity");
const land_parcel_entity_1 = require("../land/entities/land-parcel.entity");
const customer_entity_1 = require("../sales/entities/customer.entity");
const sale_entity_1 = require("../sales/entities/sale.entity");
const expense_entity_1 = require("../expenses/entities/expense.entity");
const supplier_entity_1 = require("../suppliers/entities/supplier.entity");
const LIMIT = 8;
let SearchService = class SearchService {
    projects;
    land;
    customers;
    sales;
    expenses;
    suppliers;
    constructor(projects, land, customers, sales, expenses, suppliers) {
        this.projects = projects;
        this.land = land;
        this.customers = customers;
        this.sales = sales;
        this.expenses = expenses;
        this.suppliers = suppliers;
    }
    async search(q) {
        const like = `%${q}%`;
        const [projects, land, customers, sales, expenses, suppliers] = await Promise.all([
            this.projects.find({
                where: [{ name: (0, typeorm_2.ILike)(like) }, { location: (0, typeorm_2.ILike)(like) }],
                take: LIMIT,
                order: { id: 'DESC' },
            }),
            this.land.find({
                where: [
                    { plot_number: (0, typeorm_2.ILike)(like) },
                    { owner_name: (0, typeorm_2.ILike)(like) },
                    { location: (0, typeorm_2.ILike)(like) },
                ],
                take: LIMIT,
                order: { id: 'DESC' },
            }),
            this.customers.find({
                where: [{ name: (0, typeorm_2.ILike)(like) }, { phone: (0, typeorm_2.ILike)(like) }],
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
                where: [{ description: (0, typeorm_2.ILike)(like) }, { category: (0, typeorm_2.ILike)(like) }],
                take: LIMIT,
                order: { id: 'DESC' },
            }),
            this.suppliers.find({
                where: [{ name: (0, typeorm_2.ILike)(like) }],
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
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __param(1, (0, typeorm_1.InjectRepository)(land_parcel_entity_1.LandParcel)),
    __param(2, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __param(3, (0, typeorm_1.InjectRepository)(sale_entity_1.Sale)),
    __param(4, (0, typeorm_1.InjectRepository)(expense_entity_1.Expense)),
    __param(5, (0, typeorm_1.InjectRepository)(supplier_entity_1.Supplier)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], SearchService);
//# sourceMappingURL=search.service.js.map