"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const account_entity_1 = require("./entities/account.entity");
const journal_entry_entity_1 = require("./entities/journal-entry.entity");
const journal_entry_line_entity_1 = require("./entities/journal-entry-line.entity");
const bank_account_entity_1 = require("./entities/bank-account.entity");
const bank_statement_line_entity_1 = require("./entities/bank-statement-line.entity");
const bank_reconciliation_entity_1 = require("./entities/bank-reconciliation.entity");
const accounting_service_1 = require("./accounting.service");
const accounting_controller_1 = require("./accounting.controller");
const auth_module_1 = require("../auth/auth.module");
let AccountingModule = class AccountingModule {
};
exports.AccountingModule = AccountingModule;
exports.AccountingModule = AccountingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            typeorm_1.TypeOrmModule.forFeature([
                account_entity_1.Account,
                journal_entry_entity_1.JournalEntry,
                journal_entry_line_entity_1.JournalEntryLine,
                bank_account_entity_1.BankAccount,
                bank_statement_line_entity_1.BankStatementLine,
                bank_reconciliation_entity_1.BankReconciliation,
            ]),
        ],
        controllers: [accounting_controller_1.AccountingController],
        providers: [accounting_service_1.AccountingService],
        exports: [accounting_service_1.AccountingService, typeorm_1.TypeOrmModule],
    })
], AccountingModule);
//# sourceMappingURL=accounting.module.js.map