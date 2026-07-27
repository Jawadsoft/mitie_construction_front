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
exports.LabourController = void 0;
const common_1 = require("@nestjs/common");
const labour_service_1 = require("./labour.service");
let LabourController = class LabourController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    findAllContractors() { return this.svc.findAllContractors(); }
    findOneContractor(id) { return this.svc.findOneContractor(id); }
    createContractor(dto) { return this.svc.createContractor(dto); }
    updateContractor(id, dto) { return this.svc.updateContractor(id, dto); }
    deleteContractor(id) { return this.svc.deleteContractor(id); }
    findAttendance(project_id, contractor_id) {
        return this.svc.findAttendance({ project_id, contractor_id });
    }
    createAttendance(dto) { return this.svc.createAttendance(dto); }
    updateAttendance(id, dto) { return this.svc.updateAttendance(id, dto); }
    deleteAttendance(id) { return this.svc.deleteAttendance(id); }
    calculateWages(project_id, contractor_id) {
        return this.svc.calculateWages(project_id, contractor_id);
    }
    findPayments(project_id, contractor_id) {
        return this.svc.findPayments({ project_id, contractor_id });
    }
    createPayment(dto) { return this.svc.createPayment(dto); }
    updatePayment(id, dto) { return this.svc.updatePayment(id, dto); }
    deletePayment(id) { return this.svc.deletePayment(id); }
    findAdvances(project_id, contractor_id) {
        return this.svc.findAdvances({ project_id, contractor_id });
    }
    createAdvance(dto) { return this.svc.createAdvance(dto); }
};
exports.LabourController = LabourController;
__decorate([
    (0, common_1.Get)('contractors'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "findAllContractors", null);
__decorate([
    (0, common_1.Get)('contractors/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "findOneContractor", null);
__decorate([
    (0, common_1.Post)('contractors'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "createContractor", null);
__decorate([
    (0, common_1.Patch)('contractors/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "updateContractor", null);
__decorate([
    (0, common_1.Delete)('contractors/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "deleteContractor", null);
__decorate([
    (0, common_1.Get)('attendance'),
    __param(0, (0, common_1.Query)('project_id')),
    __param(1, (0, common_1.Query)('contractor_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "findAttendance", null);
__decorate([
    (0, common_1.Post)('attendance'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "createAttendance", null);
__decorate([
    (0, common_1.Patch)('attendance/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "updateAttendance", null);
__decorate([
    (0, common_1.Delete)('attendance/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "deleteAttendance", null);
__decorate([
    (0, common_1.Get)('wages'),
    __param(0, (0, common_1.Query)('project_id')),
    __param(1, (0, common_1.Query)('contractor_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "calculateWages", null);
__decorate([
    (0, common_1.Get)('payments'),
    __param(0, (0, common_1.Query)('project_id')),
    __param(1, (0, common_1.Query)('contractor_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "findPayments", null);
__decorate([
    (0, common_1.Post)('payments'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "createPayment", null);
__decorate([
    (0, common_1.Patch)('payments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "updatePayment", null);
__decorate([
    (0, common_1.Delete)('payments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "deletePayment", null);
__decorate([
    (0, common_1.Get)('advances'),
    __param(0, (0, common_1.Query)('project_id')),
    __param(1, (0, common_1.Query)('contractor_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "findAdvances", null);
__decorate([
    (0, common_1.Post)('advances'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LabourController.prototype, "createAdvance", null);
exports.LabourController = LabourController = __decorate([
    (0, common_1.Controller)('api/labour'),
    __metadata("design:paramtypes", [labour_service_1.LabourService])
], LabourController);
//# sourceMappingURL=labour.controller.js.map