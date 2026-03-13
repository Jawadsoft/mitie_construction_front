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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const reports_service_1 = require("./reports.service");
let ReportsController = class ReportsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    getBudgetVsActual(project_id) {
        return this.svc.getBudgetVsActual(project_id);
    }
    getStageBudget(project_id) {
        return this.svc.getStageBudgetVsActual(project_id);
    }
    getProfitability(project_id) {
        return this.svc.getProjectProfitability(project_id);
    }
    getProfitLoss(from, to) {
        return this.svc.getProfitLoss(from, to);
    }
    getSupplierPayables() {
        return this.svc.getSupplierPayables();
    }
    getReceivables() {
        return this.svc.getReceivablesAging();
    }
    getLabourCost(project_id) {
        return this.svc.getLabourCost(project_id);
    }
    getCashflow(period = 'monthly', from, to) {
        return this.svc.getCashflowReport(period, from, to);
    }
    getExpenses(project_id) {
        return this.svc.getExpenseBreakdown(project_id);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('budget-vs-actual'),
    __param(0, (0, common_1.Query)('project_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getBudgetVsActual", null);
__decorate([
    (0, common_1.Get)('stage-budget/:project_id'),
    __param(0, (0, common_1.Param)('project_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getStageBudget", null);
__decorate([
    (0, common_1.Get)('profitability'),
    __param(0, (0, common_1.Query)('project_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getProfitability", null);
__decorate([
    (0, common_1.Get)('profit-loss'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getProfitLoss", null);
__decorate([
    (0, common_1.Get)('supplier-payables'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getSupplierPayables", null);
__decorate([
    (0, common_1.Get)('receivables'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getReceivables", null);
__decorate([
    (0, common_1.Get)('labour-cost'),
    __param(0, (0, common_1.Query)('project_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getLabourCost", null);
__decorate([
    (0, common_1.Get)('cashflow'),
    __param(0, (0, common_1.Query)('period')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getCashflow", null);
__decorate([
    (0, common_1.Get)('expenses'),
    __param(0, (0, common_1.Query)('project_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getExpenses", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('api/reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map