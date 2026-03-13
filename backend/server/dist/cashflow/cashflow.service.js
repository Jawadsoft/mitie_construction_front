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
exports.CashflowService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cash_transaction_entity_1 = require("./entities/cash-transaction.entity");
const typeorm_3 = require("@nestjs/typeorm");
const typeorm_4 = require("typeorm");
let CashflowService = class CashflowService {
    repo;
    ds;
    constructor(repo, ds) {
        this.repo = repo;
        this.ds = ds;
    }
    findAll(filters) {
        const q = this.repo.createQueryBuilder('t').orderBy('t.transaction_date', 'DESC');
        if (filters.project_id)
            q.andWhere('t.project_id = :pid', { pid: filters.project_id });
        if (filters.type)
            q.andWhere('t.type = :type', { type: filters.type });
        if (filters.from)
            q.andWhere('t.transaction_date >= :from', { from: filters.from });
        if (filters.to)
            q.andWhere('t.transaction_date <= :to', { to: filters.to });
        return q.getMany();
    }
    create(dto) { return this.repo.save(this.repo.create(dto)); }
    async update(id, dto) {
        await this.repo.update(id, dto);
        return this.repo.findOne({ where: { id } });
    }
    async remove(id) {
        await this.repo.delete(id);
        return { deleted: true };
    }
    async getSummary(from, to) {
        const q = this.repo.createQueryBuilder('t')
            .select('t.type', 'type')
            .addSelect('SUM(CAST(t.amount AS NUMERIC))', 'total')
            .groupBy('t.type');
        if (from)
            q.andWhere('t.transaction_date >= :from', { from });
        if (to)
            q.andWhere('t.transaction_date <= :to', { to });
        const rows = await q.getRawMany();
        const inTotal = rows.find(r => r.type === 'IN')?.total || 0;
        const outTotal = rows.find(r => r.type === 'OUT')?.total || 0;
        return { in: Number(inTotal), out: Number(outTotal), balance: Number(inTotal) - Number(outTotal) };
    }
    async getDashboardStats() {
        const summary = await this.getSummary();
        const q = (sql) => this.ds.query(sql);
        const [[activeProjects], [totalBudget], [totalExpenses], [totalLabour], [totalRevenue], [collectedRevenue], [pendingInstallments], [supplierPayables], [totalUnits], [soldUnits], stageCompletion, [stockValue], [totalMaterials]] = await Promise.all([
            q(`SELECT COUNT(*) as count FROM projects WHERE status = 'Active'`),
            q(`SELECT COALESCE(SUM(CAST(total_estimated_budget AS NUMERIC)), 0) as total FROM projects`),
            q(`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM expenses`),
            q(`SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total FROM labour_payments WHERE 1=1`),
            q(`SELECT COALESCE(SUM(CAST(total_sale_price AS NUMERIC)), 0) as total FROM sales WHERE status != 'Cancelled'`),
            q(`SELECT COALESCE(SUM(CAST(total_paid AS NUMERIC)), 0) as total FROM sales WHERE status != 'Cancelled'`),
            q(`SELECT COALESCE(SUM(CAST(due_amount AS NUMERIC) - CAST(paid_amount AS NUMERIC)), 0) as total FROM sale_installments WHERE status != 'Paid'`),
            q(`SELECT COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0) as total FROM purchase_orders WHERE status != 'Cancelled'`),
            q(`SELECT COUNT(*) as count FROM property_units`),
            q(`SELECT COUNT(*) as count FROM property_units WHERE status = 'Sold'`),
            q(`SELECT COALESCE(AVG(CAST(completion_percent AS NUMERIC)), 0) as avg_completion FROM project_stages WHERE status = 'In Progress'`),
            q(`SELECT COALESCE(SUM(CASE WHEN movement_type IN ('RECEIPT','TRANSFER_IN','ADJUSTMENT','RETURN') THEN CAST(total_cost AS NUMERIC) WHEN movement_type IN ('ISSUE','TRANSFER_OUT') THEN -CAST(total_cost AS NUMERIC) ELSE 0 END), 0) as total FROM stock_ledger`),
            q(`SELECT COALESCE(SUM(CAST(total_cost AS NUMERIC)), 0) as total FROM material_issues`),
        ]);
        const total_cost = Number(totalExpenses.total) + Number(totalLabour.total) + Number(totalMaterials.total);
        const expected_profit = Number(totalRevenue.total) - total_cost;
        return {
            cash_balance: summary.balance,
            cash_in: summary.in,
            cash_out: summary.out,
            active_projects: Number(activeProjects.count),
            total_budget: Number(totalBudget.total),
            total_expenses: Number(totalExpenses.total),
            total_labour: Number(totalLabour.total),
            total_material_cost: Number(totalMaterials.total),
            total_cost,
            total_revenue: Number(totalRevenue.total),
            collected_revenue: Number(collectedRevenue.total),
            pending_receivables: Number(pendingInstallments.total),
            supplier_payables: Number(supplierPayables.total),
            total_units: Number(totalUnits.count),
            sold_units: Number(soldUnits.count),
            avg_stage_completion: Number(stageCompletion.avg_completion),
            stock_value: Number(stockValue.total),
            expected_profit,
        };
    }
};
exports.CashflowService = CashflowService;
exports.CashflowService = CashflowService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(cash_transaction_entity_1.CashTransaction)),
    __param(1, (0, typeorm_3.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_4.DataSource])
], CashflowService);
//# sourceMappingURL=cashflow.service.js.map