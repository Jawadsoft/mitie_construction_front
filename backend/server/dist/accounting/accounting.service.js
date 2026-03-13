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
exports.AccountingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const account_entity_1 = require("./entities/account.entity");
const journal_entry_entity_1 = require("./entities/journal-entry.entity");
const journal_entry_line_entity_1 = require("./entities/journal-entry-line.entity");
const SEED_ACCOUNTS = [
    { code: '1000', name: 'Cash & Bank', type: 'ASSET' },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET' },
    { code: '1200', name: 'Inventory / Materials', type: 'ASSET' },
    { code: '1500', name: 'Fixed Assets', type: 'ASSET' },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
    { code: '2100', name: 'Bank Loans', type: 'LIABILITY' },
    { code: '3000', name: 'Owner Equity', type: 'EQUITY' },
    { code: '4000', name: 'Property Sales Revenue', type: 'INCOME' },
    { code: '4100', name: 'Other Income', type: 'INCOME' },
    { code: '5000', name: 'Construction Expenses', type: 'EXPENSE' },
    { code: '5100', name: 'Labour Expenses', type: 'EXPENSE' },
    { code: '5200', name: 'Material Expenses', type: 'EXPENSE' },
    { code: '5300', name: 'Overhead Expenses', type: 'EXPENSE' },
];
let AccountingService = class AccountingService {
    accountsRepo;
    jeRepo;
    jelRepo;
    constructor(accountsRepo, jeRepo, jelRepo) {
        this.accountsRepo = accountsRepo;
        this.jeRepo = jeRepo;
        this.jelRepo = jelRepo;
    }
    async onModuleInit() {
        for (const acc of SEED_ACCOUNTS) {
            const exists = await this.accountsRepo.findOne({ where: { code: acc.code } });
            if (!exists) {
                await this.accountsRepo.save(this.accountsRepo.create(acc));
            }
        }
    }
    findAccounts() { return this.accountsRepo.find({ where: { is_active: true }, order: { code: 'ASC' } }); }
    createAccount(dto) { return this.accountsRepo.save(this.accountsRepo.create(dto)); }
    async findJournalEntries(project_id) {
        const q = this.jeRepo.createQueryBuilder('je').orderBy('je.entry_date', 'DESC');
        if (project_id)
            q.andWhere('je.project_id = :pid', { pid: project_id });
        return q.getMany();
    }
    async findJournalEntry(id) {
        const je = await this.jeRepo.findOne({ where: { id } });
        if (!je)
            throw new common_1.NotFoundException('Journal entry not found');
        const lines = await this.jelRepo.find({ where: { journal_entry_id: id }, relations: ['account'] });
        return { ...je, lines };
    }
    async createJournalEntry(dto) {
        const debits = dto.lines.filter(l => l.dr_cr === 'DEBIT').reduce((s, l) => s + Number(l.amount), 0);
        const credits = dto.lines.filter(l => l.dr_cr === 'CREDIT').reduce((s, l) => s + Number(l.amount), 0);
        if (Math.abs(debits - credits) > 0.01) {
            throw new common_1.BadRequestException('Debits must equal credits');
        }
        const je = await this.jeRepo.save(this.jeRepo.create(dto.entry));
        for (const line of dto.lines) {
            await this.jelRepo.save(this.jelRepo.create({ ...line, journal_entry_id: je.id }));
        }
        return this.findJournalEntry(je.id);
    }
    async getTrialBalance() {
        const rows = await this.jelRepo.createQueryBuilder('l')
            .leftJoinAndSelect('l.account', 'a')
            .select('a.id', 'account_id')
            .addSelect('a.code', 'code')
            .addSelect('a.name', 'name')
            .addSelect('a.type', 'type')
            .addSelect(`SUM(CASE WHEN l.dr_cr='DEBIT' THEN CAST(l.amount AS NUMERIC) ELSE 0 END)`, 'total_debit')
            .addSelect(`SUM(CASE WHEN l.dr_cr='CREDIT' THEN CAST(l.amount AS NUMERIC) ELSE 0 END)`, 'total_credit')
            .groupBy('a.id')
            .orderBy('a.code', 'ASC')
            .getRawMany();
        return rows;
    }
};
exports.AccountingService = AccountingService;
exports.AccountingService = AccountingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(account_entity_1.Account)),
    __param(1, (0, typeorm_1.InjectRepository)(journal_entry_entity_1.JournalEntry)),
    __param(2, (0, typeorm_1.InjectRepository)(journal_entry_line_entity_1.JournalEntryLine)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AccountingService);
//# sourceMappingURL=accounting.service.js.map