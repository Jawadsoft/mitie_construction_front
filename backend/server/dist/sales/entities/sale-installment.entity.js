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
exports.SaleInstallment = void 0;
const typeorm_1 = require("typeorm");
const sale_entity_1 = require("./sale.entity");
let SaleInstallment = class SaleInstallment {
    id;
    sale_id;
    due_date;
    due_amount;
    paid_amount;
    paid_date;
    status;
    notes;
    sale;
};
exports.SaleInstallment = SaleInstallment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], SaleInstallment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], SaleInstallment.prototype, "sale_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], SaleInstallment.prototype, "due_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2 }),
    __metadata("design:type", String)
], SaleInstallment.prototype, "due_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2, default: '0.00' }),
    __metadata("design:type", String)
], SaleInstallment.prototype, "paid_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Object)
], SaleInstallment.prototype, "paid_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['Pending', 'Partial', 'Paid', 'Overdue'], default: 'Pending' }),
    __metadata("design:type", String)
], SaleInstallment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], SaleInstallment.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => sale_entity_1.Sale),
    (0, typeorm_1.JoinColumn)({ name: 'sale_id' }),
    __metadata("design:type", sale_entity_1.Sale)
], SaleInstallment.prototype, "sale", void 0);
exports.SaleInstallment = SaleInstallment = __decorate([
    (0, typeorm_1.Entity)('sale_installments')
], SaleInstallment);
//# sourceMappingURL=sale-installment.entity.js.map