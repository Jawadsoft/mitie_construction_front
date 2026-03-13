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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const TRANSACTION_TABLES = [
    'journal_entry_lines',
    'journal_entries',
    'sale_installments',
    'sales',
    'material_issues',
    'stock_ledger',
    'material_receipts',
    'po_items',
    'purchase_orders',
    'labour_advances',
    'labour_payments',
    'labour_attendance',
    'expenses',
    'fund_transactions',
    'cash_transactions',
    'stage_progress',
    'stage_budgets',
];
const FULL_RESET_EXTRA_TABLES = [
    'property_units',
    'customers',
    'project_stages',
    'projects',
    'suppliers',
    'labour_contractors',
    'fund_sources',
    'accounts',
];
let SettingsController = class SettingsController {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async reset(body) {
        if (body.confirm !== 'RESET') {
            return { success: false, message: 'Confirmation text must be "RESET".' };
        }
        if (!['transactions', 'full'].includes(body.mode)) {
            return { success: false, message: 'Invalid reset mode.' };
        }
        const tables = body.mode === 'full'
            ? [...TRANSACTION_TABLES, ...FULL_RESET_EXTRA_TABLES]
            : TRANSACTION_TABLES;
        const skipped = [];
        for (const table of tables) {
            try {
                await this.dataSource.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
            }
            catch {
                skipped.push(table);
            }
        }
        return {
            success: true,
            mode: body.mode,
            tablesCleared: tables.length - skipped.length,
            message: body.mode === 'full'
                ? 'Full reset complete. All data except users and material catalog has been cleared.'
                : 'Transaction reset complete. Financial and operational records have been cleared.',
        };
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Post)('reset'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "reset", null);
exports.SettingsController = SettingsController = __decorate([
    (0, common_1.Controller)('api/settings'),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map