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
exports.FundTransaction = void 0;
const typeorm_1 = require("typeorm");
const fund_source_entity_1 = require("./fund-source.entity");
let FundTransaction = class FundTransaction {
    id;
    fund_source_id;
    transaction_date;
    amount;
    reference_no;
    notes;
    cash_transaction_id;
    created_at;
    fund_source;
};
exports.FundTransaction = FundTransaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], FundTransaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], FundTransaction.prototype, "fund_source_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], FundTransaction.prototype, "transaction_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2 }),
    __metadata("design:type", String)
], FundTransaction.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], FundTransaction.prototype, "reference_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], FundTransaction.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true, nullable: true }),
    __metadata("design:type", Object)
], FundTransaction.prototype, "cash_transaction_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], FundTransaction.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => fund_source_entity_1.FundSource),
    (0, typeorm_1.JoinColumn)({ name: 'fund_source_id' }),
    __metadata("design:type", fund_source_entity_1.FundSource)
], FundTransaction.prototype, "fund_source", void 0);
exports.FundTransaction = FundTransaction = __decorate([
    (0, typeorm_1.Entity)('fund_transactions')
], FundTransaction);
//# sourceMappingURL=fund-transaction.entity.js.map