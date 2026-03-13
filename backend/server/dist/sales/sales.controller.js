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
exports.SalesController = void 0;
const common_1 = require("@nestjs/common");
const sales_service_1 = require("./sales.service");
let SalesController = class SalesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    findCustomers() { return this.svc.findCustomers(); }
    createCustomer(dto) { return this.svc.createCustomer(dto); }
    updateCustomer(id, dto) { return this.svc.updateCustomer(id, dto); }
    deleteCustomer(id) { return this.svc.deleteCustomer(id); }
    findUnits(project_id, status) {
        return this.svc.findUnits(project_id, status);
    }
    createUnit(dto) { return this.svc.createUnit(dto); }
    updateUnit(id, dto) { return this.svc.updateUnit(id, dto); }
    deleteUnit(id) { return this.svc.deleteUnit(id); }
    findSales(project_id, customer_id) { return this.svc.findSales(project_id, customer_id); }
    findOneSale(id) { return this.svc.findOneSale(id); }
    createSale(dto) { return this.svc.createSale(dto); }
    updateSale(id, dto) { return this.svc.updateSale(id, dto); }
    deleteSale(id) { return this.svc.deleteSale(id); }
    findInstallments(sale_id, status) {
        return this.svc.findInstallments(sale_id, status);
    }
    recordPayment(id, dto) {
        return this.svc.recordPayment(id, dto.paid_amount, dto.paid_date);
    }
};
exports.SalesController = SalesController;
__decorate([
    (0, common_1.Get)('customers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "findCustomers", null);
__decorate([
    (0, common_1.Post)('customers'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "createCustomer", null);
__decorate([
    (0, common_1.Patch)('customers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "updateCustomer", null);
__decorate([
    (0, common_1.Delete)('customers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "deleteCustomer", null);
__decorate([
    (0, common_1.Get)('units'),
    __param(0, (0, common_1.Query)('project_id')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "findUnits", null);
__decorate([
    (0, common_1.Post)('units'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "createUnit", null);
__decorate([
    (0, common_1.Patch)('units/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "updateUnit", null);
__decorate([
    (0, common_1.Delete)('units/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "deleteUnit", null);
__decorate([
    (0, common_1.Get)('list'),
    __param(0, (0, common_1.Query)('project_id')),
    __param(1, (0, common_1.Query)('customer_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "findSales", null);
__decorate([
    (0, common_1.Get)('list/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "findOneSale", null);
__decorate([
    (0, common_1.Post)('list'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "createSale", null);
__decorate([
    (0, common_1.Patch)('list/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "updateSale", null);
__decorate([
    (0, common_1.Delete)('list/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "deleteSale", null);
__decorate([
    (0, common_1.Get)('installments'),
    __param(0, (0, common_1.Query)('sale_id')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "findInstallments", null);
__decorate([
    (0, common_1.Post)('installments/:id/pay'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SalesController.prototype, "recordPayment", null);
exports.SalesController = SalesController = __decorate([
    (0, common_1.Controller)('api/sales'),
    __metadata("design:paramtypes", [sales_service_1.SalesService])
], SalesController);
//# sourceMappingURL=sales.controller.js.map