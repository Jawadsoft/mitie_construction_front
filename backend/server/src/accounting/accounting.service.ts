import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { BankAccount } from './entities/bank-account.entity';
import { BankStatementLine } from './entities/bank-statement-line.entity';
import { BankReconciliation } from './entities/bank-reconciliation.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Sale } from '../sales/entities/sale.entity';

const SEED_ACCOUNTS = [
  { code: '1000', name: 'Cash & Bank', type: 'ASSET' },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET' },
  { code: '1200', name: 'Inventory / Materials', type: 'ASSET' },
  { code: '1500', name: 'Fixed Assets', type: 'ASSET' },
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
  { code: '2100', name: 'Bank Loans', type: 'LIABILITY' },
  { code: '2200', name: 'Customer Advances', type: 'LIABILITY' },
  { code: '3000', name: 'Owner Equity', type: 'EQUITY' },
  { code: '4000', name: 'Property Sales Revenue', type: 'INCOME' },
  { code: '4100', name: 'Other Income', type: 'INCOME' },
  { code: '5000', name: 'Construction Expenses', type: 'EXPENSE' },
  { code: '5100', name: 'Labour Expenses', type: 'EXPENSE' },
  { code: '5200', name: 'Material Expenses', type: 'EXPENSE' },
  { code: '5300', name: 'Overhead Expenses', type: 'EXPENSE' },
];

@Injectable()
export class AccountingService implements OnModuleInit {
  constructor(
    @InjectRepository(Account) private readonly accountsRepo: Repository<Account>,
    @InjectRepository(JournalEntry) private readonly jeRepo: Repository<JournalEntry>,
    @InjectRepository(JournalEntryLine) private readonly jelRepo: Repository<JournalEntryLine>,
    @InjectRepository(BankAccount) private readonly bankRepo: Repository<BankAccount>,
    @InjectRepository(BankStatementLine) private readonly stmtRepo: Repository<BankStatementLine>,
    @InjectRepository(BankReconciliation) private readonly reconRepo: Repository<BankReconciliation>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    for (const acc of SEED_ACCOUNTS) {
      const exists = await this.accountsRepo.findOne({ where: { code: acc.code } });
      if (!exists) {
        await this.accountsRepo.save(this.accountsRepo.create(acc));
      }
    }
  }

  findAccounts() {
    return this.accountsRepo.find({ order: { code: 'ASC' } });
  }

  createAccount(dto: Partial<Account>) {
    return this.accountsRepo.save(this.accountsRepo.create(dto));
  }

  async updateAccount(id: string, dto: Partial<Account>) {
    const acc = await this.accountsRepo.findOne({ where: { id } });
    if (!acc) throw new NotFoundException('Account not found');
    await this.accountsRepo.update(id, dto);
    return this.accountsRepo.findOne({ where: { id } });
  }

  async findJournalEntries(project_id?: string) {
    const q = this.jeRepo.createQueryBuilder('je').orderBy('je.entry_date', 'DESC');
    if (project_id) q.andWhere('je.project_id = :pid', { pid: project_id });
    return q.getMany();
  }

  async findJournalEntry(id: string) {
    const je = await this.jeRepo.findOne({ where: { id } });
    if (!je) throw new NotFoundException('Journal entry not found');
    const lines = await this.jelRepo.find({ where: { journal_entry_id: id }, relations: ['account'] });
    return { ...je, lines };
  }

  async findAccountByCode(code: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Account) : this.accountsRepo;
    const acc = await repo.findOne({ where: { code } });
    if (!acc) {
      throw new NotFoundException(`Account code ${code} not found — ensure COA seed ran`);
    }
    return acc;
  }

  mapExpenseAccountCode(expense: Pick<Expense, 'vendor_type' | 'category'>): string {
    if (expense.vendor_type === 'LABOUR') return '5100';
    const cat = (expense.category || '').toLowerCase();
    if (expense.vendor_type === 'SUPPLIER' || /material|cement|steel|inventory/.test(cat)) {
      return '5200';
    }
    if (/overhead|land|admin|office|utility|utilities/.test(cat)) {
      return '5300';
    }
    return '5000';
  }

  async createJournalEntry(
    dto: { entry: Partial<JournalEntry>; lines: Partial<JournalEntryLine>[] },
    manager?: EntityManager,
  ) {
    const jeRepo = manager ? manager.getRepository(JournalEntry) : this.jeRepo;
    const jelRepo = manager ? manager.getRepository(JournalEntryLine) : this.jelRepo;
    const debits = dto.lines.filter((l) => l.dr_cr === 'DEBIT').reduce((s, l) => s + Number(l.amount), 0);
    const credits = dto.lines.filter((l) => l.dr_cr === 'CREDIT').reduce((s, l) => s + Number(l.amount), 0);
    if (Math.abs(debits - credits) > 0.01) {
      throw new BadRequestException('Debits must equal credits');
    }
    const je = await jeRepo.save(
      jeRepo.create({ ...dto.entry, status: dto.entry.status || 'Draft' }),
    );
    for (const line of dto.lines) {
      await jelRepo.save(jelRepo.create({ ...line, journal_entry_id: je.id }));
    }
    if (manager) {
      const lines = await jelRepo.find({ where: { journal_entry_id: je.id } });
      return { ...je, lines };
    }
    return this.findJournalEntry(je.id);
  }

  async postJournalEntry(id: string, manager?: EntityManager) {
    const jeRepo = manager ? manager.getRepository(JournalEntry) : this.jeRepo;
    const jelRepo = manager ? manager.getRepository(JournalEntryLine) : this.jelRepo;
    const je = await jeRepo.findOne({ where: { id } });
    if (!je) throw new NotFoundException('Journal entry not found');
    if (je.status === 'Posted') throw new BadRequestException('Entry is already posted');
    await jeRepo.update(id, { status: 'Posted' });
    if (manager) {
      const lines = await jelRepo.find({ where: { journal_entry_id: id } });
      return { ...je, status: 'Posted' as const, lines };
    }
    return this.findJournalEntry(id);
  }

  /** Delete journal entry + lines by exact reference_no (e.g. EXP-12). No-op if missing. */
  async deleteJournalByReference(reference_no: string, manager?: EntityManager) {
    const jeRepo = manager ? manager.getRepository(JournalEntry) : this.jeRepo;
    const jelRepo = manager ? manager.getRepository(JournalEntryLine) : this.jelRepo;
    const stmtRepo = manager ? manager.getRepository(BankStatementLine) : this.stmtRepo;
    const je = await jeRepo.findOne({ where: { reference_no } });
    if (!je) return { deleted: false, reference_no };
    await stmtRepo
      .createQueryBuilder()
      .update(BankStatementLine)
      .set({ journal_entry_id: null })
      .where('journal_entry_id = :id', { id: je.id })
      .execute();
    await jelRepo.delete({ journal_entry_id: je.id });
    await jeRepo.delete(je.id);
    return { deleted: true, reference_no, id: je.id };
  }

  async deleteJournalEntry(id: string) {
    const je = await this.jeRepo.findOne({ where: { id } });
    if (!je) throw new NotFoundException('Journal entry not found');
    await this.stmtRepo
      .createQueryBuilder()
      .update(BankStatementLine)
      .set({ journal_entry_id: null })
      .where('journal_entry_id = :id', { id })
      .execute();
    await this.jelRepo.delete({ journal_entry_id: id });
    await this.jeRepo.delete(id);
    return { deleted: true };
  }

  /**
   * Remove auto-posted JEs whose source row is already gone
   * (EXP-*, SALE-*, PMT-*, FUND-*).
   */
  async purgeOrphanAutoJournals() {
    const orphans: Array<{ id: string; reference_no: string }> = await this.dataSource.query(`
      SELECT je.id::text AS id, je.reference_no
      FROM journal_entries je
      WHERE
        (je.reference_no LIKE 'EXP-%'
          AND NOT EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id::text = SUBSTRING(je.reference_no FROM 5)
          ))
        OR (je.reference_no LIKE 'SALE-%'
          AND NOT EXISTS (
            SELECT 1 FROM sales s
            WHERE s.id::text = SUBSTRING(je.reference_no FROM 6)
          ))
        OR (je.reference_no LIKE 'PMT-%'
          AND NOT EXISTS (
            SELECT 1 FROM sale_installments si
            WHERE si.id::text = SUBSTRING(je.reference_no FROM 5)
          ))
        OR (je.reference_no LIKE 'FUND-%'
          AND NOT EXISTS (
            SELECT 1 FROM fund_transactions ft
            WHERE ft.id::text = SUBSTRING(je.reference_no FROM 6)
          ))
        OR (je.reference_no LIKE 'EXPPMT-%'
          AND NOT EXISTS (
            SELECT 1 FROM expense_payments ep
            WHERE ep.id::text = SUBSTRING(je.reference_no FROM 8)
          ))
    `);

    let deleted = 0;
    for (const row of orphans) {
      await this.deleteJournalEntry(row.id);
      deleted += 1;
    }
    return { deleted, references: orphans.map((o) => o.reference_no) };
  }

  async createAndPostEntry(
    dto: { entry: Partial<JournalEntry>; lines: Partial<JournalEntryLine>[] },
    manager?: EntityManager,
  ) {
    const created = await this.createJournalEntry(
      { entry: { ...dto.entry, status: 'Draft' }, lines: dto.lines },
      manager,
    );
    return this.postJournalEntry(created.id, manager);
  }

  async postExpenseJournal(expense: Expense, manager?: EntityManager) {
    const expenseAcc = await this.findAccountByCode(this.mapExpenseAccountCode(expense), manager);
    const amount = Number(expense.amount).toFixed(2);
    const isBill = expense.entry_mode === 'BILL' || expense.payment_type === 'Credit';
    const creditAccountId = isBill
      ? (await this.findAccountByCode('2000', manager)).id
      : await this.resolveBankAssetAccountId(expense.bank_account_id, manager);
    return this.createAndPostEntry(
      {
        entry: {
          entry_date: expense.expense_date,
          reference_no: `EXP-${expense.id}`,
          description: expense.description || `Expense ${expense.category}`,
          project_id: expense.project_id,
        },
        lines: [
          { account_id: expenseAcc.id, dr_cr: 'DEBIT', amount, narration: expense.category },
          {
            account_id: creditAccountId,
            dr_cr: 'CREDIT',
            amount,
            narration: isBill
              ? 'Accounts payable'
              : expense.bank_account_id
                ? 'Bank payment'
                : 'Cash payment',
          },
        ],
      },
      manager,
    );
  }

  async postExpenseBillPaymentJournal(
    expense: Expense,
    payment: {
      id: string;
      amount: string | number;
      paid_date: string;
      payment_method?: string;
      bank_account_id?: string | null;
    },
    manager?: EntityManager,
  ) {
    const ap = await this.findAccountByCode('2000', manager);
    const creditAccountId = await this.resolveBankAssetAccountId(payment.bank_account_id, manager);
    const amount = Number(payment.amount).toFixed(2);
    return this.createAndPostEntry(
      {
        entry: {
          entry_date: payment.paid_date,
          reference_no: `EXPPMT-${payment.id}`,
          description: `Bill payment for expense ${expense.id}`,
          project_id: expense.project_id,
        },
        lines: [
          { account_id: ap.id, dr_cr: 'DEBIT', amount, narration: 'AP reduction' },
          {
            account_id: creditAccountId,
            dr_cr: 'CREDIT',
            amount,
            narration: payment.bank_account_id
              ? payment.payment_method || 'Bank payment'
              : payment.payment_method || 'Cash payment',
          },
        ],
      },
      manager,
    );
  }

  async postSaleJournal(sale: Sale, project_id?: string | null, manager?: EntityManager) {
    const ar = await this.findAccountByCode('1100', manager);
    const revenue = await this.findAccountByCode('4000', manager);
    const amount = Number(sale.total_sale_price).toFixed(2);
    return this.createAndPostEntry(
      {
        entry: {
          entry_date: sale.sale_date,
          reference_no: `SALE-${sale.id}`,
          description: sale.notes || `Property sale ${sale.id}`,
          project_id: project_id || null,
        },
        lines: [
          { account_id: ar.id, dr_cr: 'DEBIT', amount, narration: 'Accounts receivable' },
          { account_id: revenue.id, dr_cr: 'CREDIT', amount, narration: 'Sales revenue' },
        ],
      },
      manager,
    );
  }

  async postSalePaymentJournal(
    sale: Sale,
    paidAmount: string | number,
    meta: { installment_id: string; paid_date: string; project_id?: string | null },
    manager?: EntityManager,
  ) {
    const cash = await this.findAccountByCode('1000', manager);
    const ar = await this.findAccountByCode('1100', manager);
    const amount = Number(paidAmount).toFixed(2);
    return this.createAndPostEntry(
      {
        entry: {
          entry_date: meta.paid_date,
          reference_no: `PMT-${meta.installment_id}`,
          description: `Sale payment for sale ${sale.id}`,
          project_id: meta.project_id || null,
        },
        lines: [
          { account_id: cash.id, dr_cr: 'DEBIT', amount, narration: 'Cash received' },
          { account_id: ar.id, dr_cr: 'CREDIT', amount, narration: 'AR reduction' },
        ],
      },
      manager,
    );
  }

  /** Resolve Cash & Bank COA head for a partner bank (linked account_id or default 1000). */
  async resolveBankAssetAccountId(bankAccountId: string | null | undefined, manager?: EntityManager) {
    const cashDefault = await this.findAccountByCode('1000', manager);
    if (!bankAccountId) return cashDefault.id;
    const bankRepo = manager ? manager.getRepository(BankAccount) : this.bankRepo;
    const bank = await bankRepo.findOne({ where: { id: bankAccountId } });
    if (bank?.account_id) return bank.account_id;
    return cashDefault.id;
  }

  mapFundCreditAccountCode(sourceType: string): string {
    switch (sourceType) {
      case 'LOAN':
        return '2100';
      case 'EQUITY':
      case 'INVESTOR':
        return '3000';
      case 'ADVANCE_SALES':
        return '2200';
      default:
        return '4100';
    }
  }

  async postFundReceiptJournal(
    meta: {
      fund_transaction_id: string;
      fund_source_id: string;
      source_name: string;
      source_type: string;
      bank_account_id: string | null;
      project_id: string | null;
      transaction_date: string;
      amount: string | number;
    },
    manager?: EntityManager,
  ) {
    const debitAccountId = await this.resolveBankAssetAccountId(meta.bank_account_id, manager);
    const creditAcc = await this.findAccountByCode(this.mapFundCreditAccountCode(meta.source_type), manager);
    const amount = Number(meta.amount).toFixed(2);
    return this.createAndPostEntry(
      {
        entry: {
          entry_date: meta.transaction_date,
          reference_no: `FUND-${meta.fund_transaction_id}`,
          description: `Fund receipt: ${meta.source_name}`,
          project_id: meta.project_id || null,
        },
        lines: [
          { account_id: debitAccountId, dr_cr: 'DEBIT', amount, narration: 'Cash & Bank' },
          { account_id: creditAcc.id, dr_cr: 'CREDIT', amount, narration: meta.source_type },
        ],
      },
      manager,
    );
  }

  async getTrialBalance(from?: string, to?: string) {
    const q = this.jelRepo
      .createQueryBuilder('l')
      .innerJoin('l.journal_entry', 'je')
      .leftJoinAndSelect('l.account', 'a')
      .where('je.status = :status', { status: 'Posted' })
      .select('a.id', 'account_id')
      .addSelect('a.code', 'code')
      .addSelect('a.name', 'name')
      .addSelect('a.type', 'type')
      .addSelect(`SUM(CASE WHEN l.dr_cr='DEBIT' THEN CAST(l.amount AS NUMERIC) ELSE 0 END)`, 'total_debit')
      .addSelect(`SUM(CASE WHEN l.dr_cr='CREDIT' THEN CAST(l.amount AS NUMERIC) ELSE 0 END)`, 'total_credit')
      .groupBy('a.id')
      .addGroupBy('a.code')
      .addGroupBy('a.name')
      .addGroupBy('a.type')
      .orderBy('a.code', 'ASC');
    if (from) q.andWhere('je.entry_date >= :from', { from });
    if (to) q.andWhere('je.entry_date <= :to', { to });
    return q.getRawMany();
  }

  async getGeneralLedger(account_id: string, from?: string, to?: string) {
    if (!account_id) throw new BadRequestException('account_id is required');
    const q = this.jelRepo
      .createQueryBuilder('l')
      .innerJoin('l.journal_entry', 'je')
      .where('l.account_id = :aid', { aid: account_id })
      .andWhere('je.status = :status', { status: 'Posted' })
      .orderBy('je.entry_date', 'ASC')
      .addOrderBy('je.id', 'ASC')
      .select('je.entry_date', 'entry_date')
      .addSelect('je.reference_no', 'reference_no')
      .addSelect('je.description', 'description')
      .addSelect('je.id', 'journal_entry_id')
      .addSelect(`CASE WHEN l.dr_cr='DEBIT' THEN CAST(l.amount AS NUMERIC) ELSE 0 END`, 'debit')
      .addSelect(`CASE WHEN l.dr_cr='CREDIT' THEN CAST(l.amount AS NUMERIC) ELSE 0 END`, 'credit');
    if (from) q.andWhere('je.entry_date >= :from', { from });
    if (to) q.andWhere('je.entry_date <= :to', { to });
    const rows = await q.getRawMany();
    let running = 0;
    return rows.map((r) => {
      running += Number(r.debit) - Number(r.credit);
      return { ...r, running_balance: running };
    });
  }

  async getBalanceSheet(as_of?: string) {
    const q = this.jelRepo
      .createQueryBuilder('l')
      .innerJoin('l.journal_entry', 'je')
      .innerJoin('l.account', 'a')
      .where('je.status = :status', { status: 'Posted' })
      .select('a.id', 'account_id')
      .addSelect('a.code', 'code')
      .addSelect('a.name', 'name')
      .addSelect('a.type', 'type')
      .addSelect(
        `SUM(CASE WHEN l.dr_cr='DEBIT' THEN CAST(l.amount AS NUMERIC) ELSE -CAST(l.amount AS NUMERIC) END)`,
        'balance',
      )
      .groupBy('a.id')
      .addGroupBy('a.code')
      .addGroupBy('a.name')
      .addGroupBy('a.type')
      .orderBy('a.code', 'ASC');
    if (as_of) q.andWhere('je.entry_date <= :as_of', { as_of });
    const rows = await q.getRawMany();

    const assets = rows.filter((r) => r.type === 'ASSET').map((r) => ({ ...r, balance: Number(r.balance) }));
    const liabilities = rows
      .filter((r) => r.type === 'LIABILITY')
      .map((r) => ({ ...r, balance: -Number(r.balance) }));
    const equity = rows
      .filter((r) => r.type === 'EQUITY')
      .map((r) => ({ ...r, balance: -Number(r.balance) }));

    const income = rows.filter((r) => r.type === 'INCOME').reduce((s, r) => s - Number(r.balance), 0);
    const expense = rows.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + Number(r.balance), 0);
    const net_income = income - expense;

    const total_assets = assets.reduce((s, r) => s + r.balance, 0);
    const total_liabilities = liabilities.reduce((s, r) => s + r.balance, 0);
    const total_equity = equity.reduce((s, r) => s + r.balance, 0) + net_income;

    return {
      as_of: as_of || null,
      assets,
      liabilities,
      equity,
      net_income,
      total_assets,
      total_liabilities,
      total_equity,
      balanced: Math.abs(total_assets - (total_liabilities + total_equity)) < 0.01,
    };
  }

  // ─── Bank accounts & reconciliation ─────────────────────────────────────
  findBankAccounts() {
    return this.bankRepo.find({ where: { is_active: true }, order: { name: 'ASC' } });
  }

  async createBankAccount(dto: Partial<BankAccount>) {
    let account_id = dto.account_id || null;
    if (!account_id) {
      const cash = await this.findAccountByCode('1000');
      account_id = cash.id;
    }
    return this.bankRepo.save(this.bankRepo.create({ ...dto, account_id }));
  }

  async updateBankAccount(id: string, dto: Partial<BankAccount>) {
    const row = await this.bankRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Bank account not found');
    await this.bankRepo.update(id, dto);
    return this.bankRepo.findOne({ where: { id } });
  }

  getStatementLines(bank_account_id: string) {
    return this.stmtRepo.find({
      where: { bank_account_id },
      order: { statement_date: 'DESC' },
    });
  }

  async createStatementLines(bank_account_id: string, lines: Partial<BankStatementLine>[]) {
    const bank = await this.bankRepo.findOne({ where: { id: bank_account_id } });
    if (!bank) throw new NotFoundException('Bank account not found');
    const saved: BankStatementLine[] = [];
    for (const line of lines) {
      saved.push(
        await this.stmtRepo.save(
          this.stmtRepo.create({
            ...line,
            bank_account_id,
            reconciled: false,
          }),
        ),
      );
    }
    return saved;
  }

  async matchStatementLine(
    id: string,
    dto: { cash_transaction_id?: string | null; journal_entry_id?: string | null; reconciled?: boolean },
  ) {
    const line = await this.stmtRepo.findOne({ where: { id } });
    if (!line) throw new NotFoundException('Statement line not found');
    const reconciled = dto.reconciled ?? true;
    await this.stmtRepo.update(id, {
      cash_transaction_id: dto.cash_transaction_id ?? line.cash_transaction_id,
      journal_entry_id: dto.journal_entry_id ?? line.journal_entry_id,
      reconciled,
      reconciled_at: reconciled ? new Date() : null,
    });
    return this.stmtRepo.findOne({ where: { id } });
  }

  findReconciliations(bank_account_id?: string) {
    const q = this.reconRepo.createQueryBuilder('r').orderBy('r.period_end', 'DESC');
    if (bank_account_id) q.andWhere('r.bank_account_id = :id', { id: bank_account_id });
    return q.getMany();
  }

  createReconciliation(dto: Partial<BankReconciliation>) {
    return this.reconRepo.save(this.reconRepo.create({ ...dto, status: dto.status || 'Open' }));
  }

  async completeReconciliation(id: string) {
    const row = await this.reconRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Reconciliation not found');
    await this.reconRepo.update(id, { status: 'Completed' });
    return this.reconRepo.findOne({ where: { id } });
  }
}
