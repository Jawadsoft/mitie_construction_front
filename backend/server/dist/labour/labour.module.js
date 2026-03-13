"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabourModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const labour_contractor_entity_1 = require("./entities/labour-contractor.entity");
const labour_attendance_entity_1 = require("./entities/labour-attendance.entity");
const labour_payment_entity_1 = require("./entities/labour-payment.entity");
const labour_advance_entity_1 = require("./entities/labour-advance.entity");
const labour_service_1 = require("./labour.service");
const labour_controller_1 = require("./labour.controller");
let LabourModule = class LabourModule {
};
exports.LabourModule = LabourModule;
exports.LabourModule = LabourModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([labour_contractor_entity_1.LabourContractor, labour_attendance_entity_1.LabourAttendance, labour_payment_entity_1.LabourPayment, labour_advance_entity_1.LabourAdvance])],
        controllers: [labour_controller_1.LabourController],
        providers: [labour_service_1.LabourService],
        exports: [labour_service_1.LabourService, typeorm_1.TypeOrmModule],
    })
], LabourModule);
//# sourceMappingURL=labour.module.js.map