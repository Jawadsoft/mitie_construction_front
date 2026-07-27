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
exports.LabourAdvance = void 0;
const typeorm_1 = require("typeorm");
const labour_contractor_entity_1 = require("./labour-contractor.entity");
let LabourAdvance = class LabourAdvance {
    id;
    contractor_id;
    project_id;
    advance_date;
    amount;
    recovered_amount;
    reference_no;
    notes;
    created_at;
    contractor;
};
exports.LabourAdvance = LabourAdvance;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], LabourAdvance.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], LabourAdvance.prototype, "contractor_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], LabourAdvance.prototype, "project_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], LabourAdvance.prototype, "advance_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2 }),
    __metadata("design:type", String)
], LabourAdvance.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2, default: '0.00' }),
    __metadata("design:type", String)
], LabourAdvance.prototype, "recovered_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], LabourAdvance.prototype, "reference_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], LabourAdvance.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], LabourAdvance.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => labour_contractor_entity_1.LabourContractor),
    (0, typeorm_1.JoinColumn)({ name: 'contractor_id' }),
    __metadata("design:type", labour_contractor_entity_1.LabourContractor)
], LabourAdvance.prototype, "contractor", void 0);
exports.LabourAdvance = LabourAdvance = __decorate([
    (0, typeorm_1.Entity)('labour_advances')
], LabourAdvance);
//# sourceMappingURL=labour-advance.entity.js.map