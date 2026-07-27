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
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const expense_entity_1 = require("./entities/expense.entity");
const expense_payment_entity_1 = require("./entities/expense-payment.entity");
const accounting_service_1 = require("../accounting/accounting.service");
let ExpensesService = class ExpensesService {
    repo;
    payRepo;
    dataSource;
    accounting;
    constructor(repo, payRepo, dataSource, accounting) {
        this.repo = repo;
        this.payRepo = payRepo;
        this.dataSource = dataSource;
        this.accounting = accounting;
    }
    findAll(filters) {
        const query = this.repo.createQueryBuilder('e').orderBy('e.expense_date', 'DESC');
        if (filters.project_id)
            query.andWhere('e.project_id = :pid', { pid: filters.project_id });
        if (filters.project_stage_id)
            query.andWhere('e.project_stage_id = :sid', { sid: filters.project_stage_id });
        if (filters.category)
            query.andWhere('e.category = :cat', { cat: filters.category });
        if (filters.status)
            query.andWhere('e.status = :status', { status: filters.status });
        if (filters.entry_mode)
            query.andWhere('e.entry_mode = :mode', { mode: filters.entry_mode });
        return query.getMany();
    }
    findPayments(expense_id) {
        return this.payRepo.find({
            where: { expense_id },
            order: { paid_date: 'DESC', id: 'DESC' },
        });
    }
    resolveEntryMode(dto) {
        if (dto.entry_mode === 'BILL' || dto.entry_mode === 'DIRECT')
            return dto.entry_mode;
        if (dto.payment_type === 'Credit')
            return 'BILL';
        return 'DIRECT';
    }
    async create(dto) {
        const required = ['project_id', 'project_stage_id', 'category', 'vendor_type', 'expense_date', 'amount'];
        for (const field of required) {
            if (!dto[field]) {
                throw new common_1.BadRequestException(`Field '${field}' is required for every expense`);
            }
        }
        const entry_mode = this.resolveEntryMode(dto);
        let payment_type = dto.payment_type || (entry_mode === 'BILL' ? 'Credit' : 'Cash');
        if (entry_mode === 'BILL')
            payment_type = 'Credit';
        const usesBank = entry_mode === 'DIRECT' &&
            (payment_type === 'Bank Transfer' || payment_type === 'Cheque' || payment_type === 'Bank');
        if (usesBank && !dto.bank_account_id) {
            throw new common_1.BadRequestException('Select a partner bank for this payment');
        }
        const amount = Number(dto.amount).toFixed(2);
        const paid_amount = entry_mode === 'DIRECT' ? amount : '0.00';
        const status = entry_mode === 'DIRECT' ? 'Paid' : 'Unpaid';
        return this.dataSource.transaction(async (manager) => {
            const expense = await manager.getRepository(expense_entity_1.Expense).save(manager.getRepository(expense_entity_1.Expense).create({
                ...dto,
                entry_mode,
                payment_type,
                bank_account_id: entry_mode === 'BILL' ? null : dto.bank_account_id || null,
                amount,
                paid_amount,
                status,
            }));
            await this.accounting.postExpenseJournal(expense, manager);
            return expense;
        });
    }
    async payBill(expenseId, dto) {
        if (!dto.amount || !dto.paid_date) {
            throw new common_1.BadRequestException('amount and paid_date are required');
        }
        const method = dto.payment_method || 'Cash';
        const usesBank = method === 'Bank Transfer' || method === 'Cheque' || method === 'Bank';
        if (usesBank && !dto.bank_account_id) {
            throw new common_1.BadRequestException('Select a partner bank for this payment');
        }
        return this.dataSource.transaction(async (manager) => {
            const expenseRepo = manager.getRepository(expense_entity_1.Expense);
            const payRepo = manager.getRepository(expense_payment_entity_1.ExpensePayment);
            const expense = await expenseRepo.findOne({ where: { id: expenseId } });
            if (!expense)
                throw new common_1.NotFoundException('Expense not found');
            if (expense.entry_mode !== 'BILL') {
                throw new common_1.BadRequestException('Only accrual bills can receive payments');
            }
            if (expense.status === 'Paid') {
                throw new common_1.BadRequestException('Bill is already fully paid');
            }
            const payAmt = Number(dto.amount);
            if (!(payAmt > 0))
                throw new common_1.BadRequestException('Payment amount must be positive');
            const balance = Number(expense.amount) - Number(expense.paid_amount);
            if (payAmt > balance + 0.009) {
                throw new common_1.BadRequestException(`Payment exceeds balance (PKR ${balance.toFixed(2)})`);
            }
            const payment = await payRepo.save(payRepo.create({
                expense_id: expenseId,
                amount: payAmt.toFixed(2),
                paid_date: dto.paid_date,
                payment_method: method,
                bank_account_id: dto.bank_account_id || null,
                notes: dto.notes || null,
            }));
            const newPaid = (Number(expense.paid_amount) + payAmt).toFixed(2);
            const status = Number(newPaid) >= Number(expense.amount) - 0.009 ? 'Paid' : 'Partial';
            await expenseRepo.update(expenseId, { paid_amount: newPaid, status });
            await this.accounting.postExpenseBillPaymentJournal(expense, {
                id: payment.id,
                amount: payment.amount,
                paid_date: payment.paid_date,
                payment_method: payment.payment_method,
                bank_account_id: payment.bank_account_id,
            }, manager);
            const updated = await expenseRepo.findOne({ where: { id: expenseId } });
            return { expense: updated, payment };
        });
    }
    async update(id, dto) {
        return this.dataSource.transaction(async (manager) => {
            const repo = manager.getRepository(expense_entity_1.Expense);
            const expense = await repo.findOne({ where: { id } });
            if (!expense)
                throw new common_1.NotFoundException('Expense not found');
            const entry_mode = expense.entry_mode === 'BILL' ? 'BILL' : 'DIRECT';
            let payment_type = dto.payment_type !== undefined ? String(dto.payment_type) : expense.payment_type;
            if (entry_mode === 'BILL')
                payment_type = 'Credit';
            const bank_account_id = entry_mode === 'BILL'
                ? null
                : dto.bank_account_id !== undefined
                    ? dto.bank_account_id || null
                    : expense.bank_account_id;
            const usesBank = entry_mode === 'DIRECT' &&
                (payment_type === 'Bank Transfer' ||
                    payment_type === 'Cheque' ||
                    payment_type === 'Bank');
            if (usesBank && !bank_account_id) {
                throw new common_1.BadRequestException('Select a partner bank for this payment');
            }
            const nextAmount = dto.amount !== undefined ? Number(dto.amount).toFixed(2) : expense.amount;
            if (!(Number(nextAmount) > 0)) {
                throw new common_1.BadRequestException('Amount must be positive');
            }
            let paid_amount = expense.paid_amount;
            let status = expense.status;
            if (entry_mode === 'DIRECT') {
                paid_amount = nextAmount;
                status = 'Paid';
            }
            else {
                if (Number(nextAmount) + 0.009 < Number(expense.paid_amount)) {
                    throw new common_1.BadRequestException(`Amount cannot be less than already paid (PKR ${Number(expense.paid_amount).toFixed(2)})`);
                }
                status =
                    Number(expense.paid_amount) <= 0.009
                        ? 'Unpaid'
                        : Number(expense.paid_amount) >= Number(nextAmount) - 0.009
                            ? 'Paid'
                            : 'Partial';
            }
            const project_id = dto.project_id !== undefined && dto.project_id
                ? String(dto.project_id)
                : expense.project_id;
            const project_stage_id = dto.project_stage_id !== undefined && dto.project_stage_id
                ? String(dto.project_stage_id)
                : expense.project_stage_id;
            if (!project_id)
                throw new common_1.BadRequestException('Project is required');
            if (!project_stage_id)
                throw new common_1.BadRequestException('Stage is required');
            await repo.update(id, {
                project_id,
                project_stage_id,
                ...(dto.category !== undefined ? { category: dto.category } : {}),
                ...(dto.vendor_type !== undefined ? { vendor_type: dto.vendor_type } : {}),
                ...(dto.supplier_id !== undefined ? { supplier_id: dto.supplier_id || null } : {}),
                ...(dto.contractor_id !== undefined
                    ? { contractor_id: dto.contractor_id || null }
                    : {}),
                payment_type,
                bank_account_id,
                ...(dto.expense_date !== undefined ? { expense_date: dto.expense_date } : {}),
                amount: nextAmount,
                paid_amount,
                status,
                ...(dto.description !== undefined ? { description: dto.description || null } : {}),
            });
            const updated = await repo.findOne({ where: { id } });
            if (!updated)
                throw new common_1.NotFoundException('Expense not found');
            await this.accounting.deleteJournalByReference(`EXP-${id}`, manager);
            await this.accounting.postExpenseJournal(updated, manager);
            if (entry_mode === 'BILL' && String(project_id) !== String(expense.project_id)) {
                const payments = await manager.getRepository(expense_payment_entity_1.ExpensePayment).find({
                    where: { expense_id: id },
                });
                for (const p of payments) {
                    await this.accounting.deleteJournalByReference(`EXPPMT-${p.id}`, manager);
                    await this.accounting.postExpenseBillPaymentJournal(updated, {
                        id: p.id,
                        amount: p.amount,
                        paid_date: p.paid_date,
                        payment_method: p.payment_method,
                        bank_account_id: p.bank_account_id,
                    }, manager);
                }
            }
            return updated;
        });
    }
    async remove(id) {
        return this.dataSource.transaction(async (manager) => {
            const repo = manager.getRepository(expense_entity_1.Expense);
            const payRepo = manager.getRepository(expense_payment_entity_1.ExpensePayment);
            const e = await repo.findOne({ where: { id } });
            if (!e)
                throw new common_1.BadRequestException('Expense not found');
            const payments = await payRepo.find({ where: { expense_id: id } });
            for (const p of payments) {
                await this.accounting.deleteJournalByReference(`EXPPMT-${p.id}`, manager);
            }
            await payRepo.delete({ expense_id: id });
            await this.accounting.deleteJournalByReference(`EXP-${id}`, manager);
            await repo.delete(id);
            return { deleted: true };
        });
    }
    async getSummary(project_id) {
        const query = this.repo
            .createQueryBuilder('e')
            .select('SUM(CAST(e.amount AS NUMERIC))', 'total')
            .addSelect('e.category', 'category')
            .groupBy('e.category');
        if (project_id)
            query.andWhere('e.project_id = :pid', { pid: project_id });
        return query.getRawMany();
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(expense_entity_1.Expense)),
    __param(1, (0, typeorm_1.InjectRepository)(expense_payment_entity_1.ExpensePayment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        accounting_service_1.AccountingService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map