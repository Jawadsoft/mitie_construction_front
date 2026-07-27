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
exports.MaterialRequestItem = void 0;
const typeorm_1 = require("typeorm");
const material_request_entity_1 = require("./material-request.entity");
let MaterialRequestItem = class MaterialRequestItem {
    id;
    material_request_id;
    material_id;
    material_name;
    unit;
    quantity_requested;
    quantity_approved;
    estimated_unit_cost;
    notes;
    material_request;
};
exports.MaterialRequestItem = MaterialRequestItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], MaterialRequestItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], MaterialRequestItem.prototype, "material_request_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true, nullable: true }),
    __metadata("design:type", Object)
], MaterialRequestItem.prototype, "material_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150 }),
    __metadata("design:type", String)
], MaterialRequestItem.prototype, "material_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30 }),
    __metadata("design:type", String)
], MaterialRequestItem.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 3 }),
    __metadata("design:type", String)
], MaterialRequestItem.prototype, "quantity_requested", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 3, nullable: true }),
    __metadata("design:type", Object)
], MaterialRequestItem.prototype, "quantity_approved", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], MaterialRequestItem.prototype, "estimated_unit_cost", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MaterialRequestItem.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => material_request_entity_1.MaterialRequest),
    (0, typeorm_1.JoinColumn)({ name: 'material_request_id' }),
    __metadata("design:type", material_request_entity_1.MaterialRequest)
], MaterialRequestItem.prototype, "material_request", void 0);
exports.MaterialRequestItem = MaterialRequestItem = __decorate([
    (0, typeorm_1.Entity)('material_request_items')
], MaterialRequestItem);
//# sourceMappingURL=material-request-item.entity.js.map