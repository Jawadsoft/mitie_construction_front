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
exports.AccountingController = void 0;
const common_1 = require("@nestjs/common");
const accounting_service_1 = require("./accounting.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const WRITE_ROLES = ['Admin', 'Owner / Director', 'Accountant'];
let AccountingController = class AccountingController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    findAccounts() { return this.svc.findAccounts(); }
    createAccount(dto) { return this.svc.createAccount(dto); }
    updateAccount(id, dto) {
        return this.svc.updateAccount(id, dto);
    }
    findJournalEntries(project_id) {
        return this.svc.findJournalEntries(project_id);
    }
    findJournalEntry(id) {
        return this.svc.findJournalEntry(id);
    }
    createJournalEntry(dto) {
        return this.svc.createJournalEntry(dto);
    }
    purgeOrphanAutoJournals() {
        return this.svc.purgeOrphanAutoJournals();
    }
    rebuildAllVoucherJournals(body) {
        return this.svc.rebuildAllVoucherJournals({
            apply: body?.apply !== false,
            default_collection_bank_id: body?.default_collection_bank_id ?? null,
        });
    }
    postJournalEntry(id) {
        return this.svc.postJournalEntry(id);
    }
    updateJournalEntry(id, dto) {
        return this.svc.updateJournalEntry(id, dto);
    }
    deleteJournalEntry(id) {
        return this.svc.deleteJournalEntry(id);
    }
    getTrialBalance(from, to) {
        return this.svc.getTrialBalance(from, to);
    }
    getGeneralLedger(account_id, from, to, include_children) {
        const includeChildren = include_children === undefined
            ? undefined
            : include_children === 'true' || include_children === '1';
        return this.svc.getGeneralLedger(account_id, from, to, includeChildren);
    }
    getBalanceSheet(as_of) {
        return this.svc.getBalanceSheet(as_of);
    }
    findBankAccounts() { return this.svc.findBankAccounts(); }
    createBankAccount(dto) {
        return this.svc.createBankAccount(dto);
    }
    updateBankAccount(id, dto) {
        return this.svc.updateBankAccount(id, dto);
    }
    getStatementLines(id) {
        return this.svc.getStatementLines(id);
    }
    createStatementLines(id, dto) {
        return this.svc.createStatementLines(id, dto.lines || []);
    }
    matchStatementLine(id, dto) {
        return this.svc.matchStatementLine(id, dto);
    }
    findReconciliations(bank_account_id) {
        return this.svc.findReconciliations(bank_account_id);
    }
    createReconciliation(dto) {
        return this.svc.createReconciliation(dto);
    }
    completeReconciliation(id) {
        return this.svc.completeReconciliation(id);
    }
};
exports.AccountingController = AccountingController;
__decorate([
    (0, common_1.Get)('accounts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "findAccounts", null);
__decorate([
    (0, common_1.Post)('accounts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...WRITE_ROLES),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createAccount", null);
__decorate([
    (0, common_1.Patch)('accounts/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...WRITE_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "updateAccount", null);
__decorate([
    (0, common_1.Get)('journal'),
    __param(0, (0, common_1.Query)('project_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "findJournalEntries", null);
__decorate([
    (0, common_1.Get)('journal/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "findJournalEntry", null);
__decorate([
    (0, common_1.Post)('journal'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...WRITE_ROLES),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createJournalEntry", null);
__decorate([
    (0, common_1.Post)('journal/purge-orphans'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...WRITE_ROLES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "purgeOrphanAutoJournals", null);
__decorate([
    (0, common_1.Post)('journal/rebuild-vouchers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...WRITE_ROLES),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "rebuildAllVoucherJournals", null);
__decorate([
    (0, common_1.Post)('journal/:id/post'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...WRITE_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "postJournalEntry", null);
__decorate([
    (0, common_1.Patch)('journal/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...WRITE_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "updateJournalEntry", null);
__decorate([
    (0, common_1.Delete)('journal/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...WRITE_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "deleteJournalEntry", null);
__decorate([
    (0, common_1.Get)('reports/trial-balance'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "getTrialBalance", null);
__decorate([
    (0, common_1.Get)('reports/general-ledger'),
    __param(0, (0, common_1.Query)('account_id')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('include_children')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "getGeneralLedger", null);
__decorate([
    (0, common_1.Get)('reports/balance-sheet'),
    __param(0, (0, common_1.Query)('as_of')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "getBalanceSheet", null);
__decorate([
    (0, common_1.Get)('bank-accounts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "findBankAccounts", null);
__decorate([
    (0, common_1.Post)('bank-accounts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...WRITE_ROLES),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createBankAccount", null);
__decorate([
    (0, common_1.Patch)('bank-accounts/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...WRITE_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "updateBankAccount", null);
__decorate([
    (0, common_1.Get)('bank-accounts/:id/statements'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "getStatementLines", null);
__decorate([
    (0, common_1.Post)('bank-accounts/:id/statements'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...WRITE_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createStatementLines", null);
__decorate([
    (0, common_1.Patch)('statement-lines/:id/match'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...WRITE_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "matchStatementLine", null);
__decorate([
    (0, common_1.Get)('reconciliations'),
    __param(0, (0, common_1.Query)('bank_account_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "findReconciliations", null);
__decorate([
    (0, common_1.Post)('reconciliations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...WRITE_ROLES),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createReconciliation", null);
__decorate([
    (0, common_1.Post)('reconciliations/:id/complete'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...WRITE_ROLES),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "completeReconciliation", null);
exports.AccountingController = AccountingController = __decorate([
    (0, common_1.Controller)('api/accounting'),
    __metadata("design:paramtypes", [accounting_service_1.AccountingService])
], AccountingController);
//# sourceMappingURL=accounting.controller.js.map