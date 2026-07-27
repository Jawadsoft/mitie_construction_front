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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let NotificationsService = class NotificationsService {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async summary() {
        const items = [];
        const lowStock = await this.dataSource.query(`
        SELECT m.id::text AS id, m.name,
          COALESCE((
            SELECT SUM(CASE
              WHEN sl.movement_type IN ('RECEIPT','TRANSFER_IN','ADJUSTMENT','RETURN') THEN sl.quantity
              WHEN sl.movement_type IN ('ISSUE','TRANSFER_OUT') THEN -sl.quantity
              ELSE 0 END)
            FROM stock_ledger sl WHERE sl.material_id = m.id
          ), 0)::text AS current_stock,
          COALESCE(m.min_stock_level, 0)::text AS min_stock_level
        FROM materials m
        WHERE m.is_active = true
          AND m.min_stock_level IS NOT NULL
          AND COALESCE((
            SELECT SUM(CASE
              WHEN sl.movement_type IN ('RECEIPT','TRANSFER_IN','ADJUSTMENT','RETURN') THEN sl.quantity
              WHEN sl.movement_type IN ('ISSUE','TRANSFER_OUT') THEN -sl.quantity
              ELSE 0 END)
            FROM stock_ledger sl WHERE sl.material_id = m.id
          ), 0) < m.min_stock_level
        ORDER BY m.name
        LIMIT 20
      `).catch(() => []);
        for (const row of lowStock) {
            items.push({
                id: `low_stock:${row.id}`,
                type: 'low_stock',
                title: 'Low Stock',
                body: `${row.name} below minimum (${row.current_stock} / min ${row.min_stock_level})`,
                href: '/inventory',
                created_at: new Date().toISOString(),
            });
        }
        const budget = await this.dataSource.query(`
        SELECT p.id::text AS id, p.name,
          COALESCE(p.total_estimated_budget, 0)::text AS budget,
          (
            COALESCE((SELECT SUM(e.amount::numeric) FROM expenses e WHERE e.project_id = p.id), 0)
            + COALESCE((SELECT SUM(lp.amount::numeric) FROM labour_payments lp WHERE lp.project_id = p.id), 0)
            + COALESCE((SELECT SUM(mi.total_cost::numeric) FROM material_issues mi WHERE mi.project_id = p.id), 0)
          )::text AS spent
        FROM projects p
        WHERE p.deleted_at IS NULL
          AND p.total_estimated_budget IS NOT NULL
          AND p.total_estimated_budget::numeric > 0
          AND (
            COALESCE((SELECT SUM(e.amount::numeric) FROM expenses e WHERE e.project_id = p.id), 0)
            + COALESCE((SELECT SUM(lp.amount::numeric) FROM labour_payments lp WHERE lp.project_id = p.id), 0)
            + COALESCE((SELECT SUM(mi.total_cost::numeric) FROM material_issues mi WHERE mi.project_id = p.id), 0)
          ) > p.total_estimated_budget::numeric
        LIMIT 20
      `).catch(() => []);
        for (const row of budget) {
            items.push({
                id: `budget:${row.id}`,
                type: 'budget_exceeded',
                title: 'Budget Exceeded',
                body: `${row.name}: spent PKR ${Number(row.spent).toLocaleString()} of ${Number(row.budget).toLocaleString()}`,
                href: `/projects/${row.id}?tab=profitability`,
                created_at: new Date().toISOString(),
            });
        }
        const mrs = await this.dataSource.query(`
        SELECT id::text AS id,
          COALESCE(request_no, id::text) AS request_no,
          status,
          created_at::text AS created_at
        FROM material_requests
        WHERE status IN ('Submitted', 'Pending', 'Pending Approval')
        ORDER BY created_at DESC
        LIMIT 20
      `).catch(() => []);
        for (const row of mrs) {
            items.push({
                id: `mr:${row.id}`,
                type: 'mr_pending',
                title: 'MR Waiting Approval',
                body: `Material request ${row.request_no} is ${row.status}`,
                href: '/procurement',
                created_at: row.created_at || new Date().toISOString(),
            });
        }
        const overdue = await this.dataSource.query(`
        SELECT si.id::text AS id, si.sale_id::text AS sale_id,
          si.due_date::text AS due_date, si.due_amount::text AS due_amount,
          COALESCE(c.name, 'Customer') AS customer
        FROM sale_installments si
        JOIN sales s ON s.id = si.sale_id
        LEFT JOIN customers c ON c.id = s.customer_id
        WHERE si.status IN ('Pending', 'Partial', 'Unpaid')
          AND si.due_date < CURRENT_DATE
          AND s.status != 'Cancelled'
        ORDER BY si.due_date ASC
        LIMIT 20
      `).catch(() => []);
        for (const row of overdue) {
            items.push({
                id: `inst:${row.id}`,
                type: 'installment_overdue',
                title: 'Installment Overdue',
                body: `${row.customer}: PKR ${Number(row.due_amount).toLocaleString()} due ${row.due_date}`,
                href: '/sales?tab=collections',
                created_at: row.due_date,
            });
        }
        return { items };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map