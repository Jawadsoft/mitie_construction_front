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
exports.FundsController = void 0;
const common_1 = require("@nestjs/common");
const funds_service_1 = require("./funds.service");
let FundsController = class FundsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    findSources(project_id) { return this.svc.findSources(project_id); }
    findOneSource(id) { return this.svc.findOneSource(id); }
    createSource(dto) { return this.svc.createSource(dto); }
    updateSource(id, dto) { return this.svc.updateSource(id, dto); }
    deleteSource(id) { return this.svc.deleteSource(id); }
    findTransactions(fund_source_id) { return this.svc.findTransactions(fund_source_id); }
    createTransaction(dto) { return this.svc.createTransaction(dto); }
    updateTransaction(id, dto) { return this.svc.updateTransaction(id, dto); }
    deleteTransaction(id) { return this.svc.deleteTransaction(id); }
};
exports.FundsController = FundsController;
__decorate([
    (0, common_1.Get)('sources'),
    __param(0, (0, common_1.Query)('project_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "findSources", null);
__decorate([
    (0, common_1.Get)('sources/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "findOneSource", null);
__decorate([
    (0, common_1.Post)('sources'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "createSource", null);
__decorate([
    (0, common_1.Patch)('sources/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "updateSource", null);
__decorate([
    (0, common_1.Delete)('sources/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "deleteSource", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Query)('fund_source_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "findTransactions", null);
__decorate([
    (0, common_1.Post)('transactions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "createTransaction", null);
__decorate([
    (0, common_1.Patch)('transactions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "updateTransaction", null);
__decorate([
    (0, common_1.Delete)('transactions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "deleteTransaction", null);
exports.FundsController = FundsController = __decorate([
    (0, common_1.Controller)('api/funds'),
    __metadata("design:paramtypes", [funds_service_1.FundsService])
], FundsController);
//# sourceMappingURL=funds.controller.js.map