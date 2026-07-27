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
exports.JournalEntryLine = void 0;
const typeorm_1 = require("typeorm");
const journal_entry_entity_1 = require("./journal-entry.entity");
const account_entity_1 = require("./account.entity");
let JournalEntryLine = class JournalEntryLine {
    id;
    journal_entry_id;
    account_id;
    dr_cr;
    amount;
    narration;
    journal_entry;
    account;
};
exports.JournalEntryLine = JournalEntryLine;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], JournalEntryLine.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], JournalEntryLine.prototype, "journal_entry_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], JournalEntryLine.prototype, "account_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['DEBIT', 'CREDIT'] }),
    __metadata("design:type", String)
], JournalEntryLine.prototype, "dr_cr", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2 }),
    __metadata("design:type", String)
], JournalEntryLine.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], JournalEntryLine.prototype, "narration", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => journal_entry_entity_1.JournalEntry),
    (0, typeorm_1.JoinColumn)({ name: 'journal_entry_id' }),
    __metadata("design:type", journal_entry_entity_1.JournalEntry)
], JournalEntryLine.prototype, "journal_entry", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => account_entity_1.Account),
    (0, typeorm_1.JoinColumn)({ name: 'account_id' }),
    __metadata("design:type", account_entity_1.Account)
], JournalEntryLine.prototype, "account", void 0);
exports.JournalEntryLine = JournalEntryLine = __decorate([
    (0, typeorm_1.Entity)('journal_entry_lines')
], JournalEntryLine);
//# sourceMappingURL=journal-entry-line.entity.js.map