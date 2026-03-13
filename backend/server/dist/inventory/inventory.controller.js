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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
let InventoryController = class InventoryController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    findMaterials(category) {
        return this.svc.findAllMaterials(category);
    }
    getCategories() { return this.svc.getCategories(); }
    findOne(id) { return this.svc.findOneMaterial(id); }
    createMaterial(dto) { return this.svc.createMaterial(dto); }
    updateMaterial(id, dto) { return this.svc.updateMaterial(id, dto); }
    deleteMaterial(id) { return this.svc.deleteMaterial(id); }
    getStock(project_id) {
        return this.svc.getStockSummary(project_id);
    }
    getLowStock() { return this.svc.getLowStockAlerts(); }
    getLedger(material_id, project_id, movement_type, from, to) {
        return this.svc.getLedger({ material_id, project_id, movement_type, from, to });
    }
    receiveStock(dto) { return this.svc.receiveStock(dto); }
    issueMaterial(dto) { return this.svc.issueMaterial(dto); }
    getIssues(project_id, project_stage_id, material_id) {
        return this.svc.getIssues({ project_id, project_stage_id, material_id });
    }
    adjustStock(dto) { return this.svc.adjustStock(dto); }
    getUtilization(project_id) {
        return this.svc.getProjectUtilization(project_id);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)('materials'),
    __param(0, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "findMaterials", null);
__decorate([
    (0, common_1.Get)('materials/categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('materials/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('materials'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createMaterial", null);
__decorate([
    (0, common_1.Patch)('materials/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updateMaterial", null);
__decorate([
    (0, common_1.Delete)('materials/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "deleteMaterial", null);
__decorate([
    (0, common_1.Get)('stock'),
    __param(0, (0, common_1.Query)('project_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getStock", null);
__decorate([
    (0, common_1.Get)('stock/low-alerts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getLowStock", null);
__decorate([
    (0, common_1.Get)('ledger'),
    __param(0, (0, common_1.Query)('material_id')),
    __param(1, (0, common_1.Query)('project_id')),
    __param(2, (0, common_1.Query)('movement_type')),
    __param(3, (0, common_1.Query)('from')),
    __param(4, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getLedger", null);
__decorate([
    (0, common_1.Post)('receive'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "receiveStock", null);
__decorate([
    (0, common_1.Post)('issue'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "issueMaterial", null);
__decorate([
    (0, common_1.Get)('issues'),
    __param(0, (0, common_1.Query)('project_id')),
    __param(1, (0, common_1.Query)('project_stage_id')),
    __param(2, (0, common_1.Query)('material_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getIssues", null);
__decorate([
    (0, common_1.Post)('adjust'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "adjustStock", null);
__decorate([
    (0, common_1.Get)('utilization/:project_id'),
    __param(0, (0, common_1.Param)('project_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getUtilization", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)('api/inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map