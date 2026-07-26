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
    await this.ensureBankCoaSubAccounts();
  }

  /** Next free code in 1001–1099 for Cash & Bank children. */
  private async nextCashBankChildCode(manager?: EntityManager): Promise<string> {
    const repo = manager ? manager.getRepository(Account) : this.accountsRepo;
    const rows = await repo
      .createQueryBuilder('a')
      .where(`a.code LIKE :pfx`, { pfx: '10%' })
      .andWhere(`LENGTH(a.code) = 4`)
      .andWhere(`a.code <> '1000'`)
      .getMany();
    const used = new Set(rows.map((r) => r.code));
    for (let n = 1001; n <= 1099; n += 1) {
      const code = String(n);
      if (!used.has(code)) return code;
    }
    throw new BadRequestException('No free Cash & Bank sub-account codes (1001–1099)');
  }

  private bankCoaDisplayName(dto: Partial<BankAccount>): string {
    const name = (dto.name || '').trim();
    const bank = (dto.bank_name || '').trim();
    if (bank && name && bank.toLowerCase() !== name.toLowerCase()) {
      return `${bank} — ${name}`;
    }
    return name || bank || 'Bank Account';
  }

  /**
   * Create a COA ASSET under 1000 Cash & Bank for a partner bank.
   * Parent 1000 stays a header; postings go to the child.
   */
  private async createCashBankSubAccount(
    dto: Partial<BankAccount>,
    manager?: EntityManager,
  ): Promise<Account> {
    const repo = manager ? manager.getRepository(Account) : this.accountsRepo;
    const cash = await this.findAccountByCode('1000', manager);
    const code = await this.nextCashBankChildCode(manager);
    return repo.save(
      repo.create({
        code,
        name: this.bankCoaDisplayName(dto),
        type: 'ASSET',
        is_active: true,
        parent_account_id: cash.id,
      }),
    );
  }

  private async postBankOpeningBalance(
    bank: BankAccount,
    accountId: string,
    manager?: EntityManager,
    entryDate?: string,
  ) {
    const opening = Number(bank.opening_balance || 0);
    if (!(opening > 0)) return null;
    const ref = `BANK-OPEN-${bank.id}`;
    const jeRepo = manager ? manager.getRepository(JournalEntry) : this.jeRepo;
    const existing = await jeRepo.findOne({ where: { reference_no: ref } });
    if (existing) return existing;
    const equity = await this.findAccountByCode('3000', manager);
    const amount = opening.toFixed(2);
    return this.createAndPostEntry(
      {
        entry: {
          entry_date: entryDate || new Date().toISOString().slice(0, 10),
          reference_no: ref,
          description: `Opening balance: ${bank.name}`,
        },
        lines: [
          {
            account_id: accountId,
            dr_cr: 'DEBIT',
            amount,
            narration: 'Opening bank balance',
          },
          {
            account_id: equity.id,
            dr_cr: 'CREDIT',
            amount,
            narration: 'Opening equity',
          },
        ],
      },
      manager,
    );
  }

  /**
   * Replace BANK-OPEN-{bankId} journal to match opening_balance.
   * Amount 0 deletes the opening JE (clear opening).
   */
  private async syncBankOpeningBalance(
    bank: BankAccount,
    opts?: { entry_date?: string; manager?: EntityManager },
  ) {
    const manager = opts?.manager;
    const ref = `BANK-OPEN-${bank.id}`;
    const jeRepo = manager ? manager.getRepository(JournalEntry) : this.jeRepo;
    const existing = await jeRepo.findOne({ where: { reference_no: ref } });
    const entryDate =
      opts?.entry_date ||
      (existing?.entry_date
        ? String(existing.entry_date).slice(0, 10)
        : new Date().toISOString().slice(0, 10));

    await this.deleteJournalByReference(ref, manager);

    if (!bank.account_id) return null;
    return this.postBankOpeningBalance(bank, bank.account_id, manager, entryDate);
  }

  /** Migrate banks that still point at parent 1000 (or null) onto their own sub-accounts. */
  private async ensureBankCoaSubAccounts() {
    const cash = await this.findAccountByCode('1000');
    const banks = await this.bankRepo.find();
    for (const bank of banks) {
      try {
        if (bank.account_id && bank.account_id !== cash.id) {
          const linked = await this.accountsRepo.findOne({ where: { id: bank.account_id } });
          if (linked && !linked.parent_account_id) {
            await this.accountsRepo.update(linked.id, { parent_account_id: cash.id });
          }
          continue;
        }
        await this.dataSource.transaction(async (manager) => {
          const sub = await this.createCashBankSubAccount(bank, manager);
          await manager.getRepository(BankAccount).update(bank.id, { account_id: sub.id });
          const refreshed = { ...bank, account_id: sub.id };
          await this.postBankOpeningBalance(refreshed, sub.id, manager);
        });
      } catch (err) {
        console.error(`ensureBankCoaSubAccounts failed for bank ${bank.id}:`, err);
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

  async updateJournalEntry(
    id: string,
    dto: { entry?: Partial<JournalEntry>; lines?: Partial<JournalEntryLine>[] },
  ) {
    return this.dataSource.transaction(async (manager) => {
      const jeRepo = manager.getRepository(JournalEntry);
      const jelRepo = manager.getRepository(JournalEntryLine);
      const je = await jeRepo.findOne({ where: { id } });
      if (!je) throw new NotFoundException('Journal entry not found');

      if (dto.lines?.length) {
        const debits = dto.lines
          .filter((l) => l.dr_cr === 'DEBIT')
          .reduce((s, l) => s + Number(l.amount), 0);
        const credits = dto.lines
          .filter((l) => l.dr_cr === 'CREDIT')
          .reduce((s, l) => s + Number(l.amount), 0);
        if (Math.abs(debits - credits) > 0.01) {
          throw new BadRequestException('Debits must equal credits');
        }
        if (dto.lines.some((l) => !l.account_id || !l.amount)) {
          throw new BadRequestException('All lines must have an account and amount');
        }
        await jelRepo.delete({ journal_entry_id: id });
        for (const line of dto.lines) {
          await jelRepo.save(
            jelRepo.create({
              account_id: line.account_id,
              dr_cr: line.dr_cr,
              amount: Number(line.amount).toFixed(2),
              narration: line.narration ?? null,
              journal_entry_id: id,
            }),
          );
        }
      }

      const patch: Partial<JournalEntry> = {};
      if (dto.entry?.entry_date !== undefined) patch.entry_date = dto.entry.entry_date;
      if (dto.entry?.reference_no !== undefined) patch.reference_no = dto.entry.reference_no;
      if (dto.entry?.description !== undefined) patch.description = dto.entry.description;
      if (dto.entry?.project_id !== undefined) patch.project_id = dto.entry.project_id;
      if (Object.keys(patch).length) {
        await jeRepo.update(id, patch);
      }

      const updated = await jeRepo.findOne({ where: { id } });
      const lines = await jelRepo.find({ where: { journal_entry_id: id }, relations: ['account'] });
      return { ...updated!, lines };
    });
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

  /** Delete all journals matching exact ref or ref with suffix (e.g. PMT-12, PMT-12-171...). */
  async deleteJournalsByReferencePrefix(reference_no: string, manager?: EntityManager) {
    const jeRepo = manager ? manager.getRepository(JournalEntry) : this.jeRepo;
    const jelRepo = manager ? manager.getRepository(JournalEntryLine) : this.jelRepo;
    const stmtRepo = manager ? manager.getRepository(BankStatementLine) : this.stmtRepo;
    const rows = await jeRepo
      .createQueryBuilder('je')
      .where('je.reference_no = :ref', { ref: reference_no })
      .orWhere('je.reference_no LIKE :pfx', { pfx: `${reference_no}-%` })
      .getMany();
    let deleted = 0;
    for (const je of rows) {
      await stmtRepo
        .createQueryBuilder()
        .update(BankStatementLine)
        .set({ journal_entry_id: null })
        .where('journal_entry_id = :id', { id: je.id })
        .execute();
      await jelRepo.delete({ journal_entry_id: je.id });
      await jeRepo.delete(je.id);
      deleted += 1;
    }
    return { deleted, reference_no };
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
    meta: {
      installment_id: string;
      paid_date: string;
      project_id?: string | null;
      bank_account_id?: string | null;
    },
    manager?: EntityManager,
  ) {
    const debitAccountId = await this.resolveBankAssetAccountId(
      meta.bank_account_id,
      manager,
    );
    const ar = await this.findAccountByCode('1100', manager);
    const amount = Number(paidAmount).toFixed(2);

    let debitNarration = 'Cash received';
    if (meta.bank_account_id) {
      const bankRepo = manager ? manager.getRepository(BankAccount) : this.bankRepo;
      const bank = await bankRepo.findOne({ where: { id: meta.bank_account_id } });
      if (bank) {
        debitNarration = `Bank: ${bank.bank_name || bank.name}`;
      }
    }

    return this.createAndPostEntry(
      {
        entry: {
          entry_date: meta.paid_date,
          reference_no: `PMT-${meta.installment_id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          description: `Sale payment for sale ${sale.id}`,
          project_id: meta.project_id || null,
        },
        lines: [
          { account_id: debitAccountId, dr_cr: 'DEBIT', amount, narration: debitNarration },
          { account_id: ar.id, dr_cr: 'CREDIT', amount, narration: 'AR reduction' },
        ],
      },
      manager,
    );
  }

  /**
   * Resolve GL cash/bank asset for a partner bank.
   * Uses the bank's linked COA sub-account (under 1000). Falls back to parent 1000
   * only when no bank is specified (e.g. pure cash).
   */
  async resolveBankAssetAccountId(bankAccountId: string | null | undefined, manager?: EntityManager) {
    const cashDefault = await this.findAccountByCode('1000', manager);
    if (!bankAccountId) return cashDefault.id;
    const bankRepo = manager ? manager.getRepository(BankAccount) : this.bankRepo;
    const bank = await bankRepo.findOne({ where: { id: bankAccountId } });
    if (bank?.account_id && bank.account_id !== cashDefault.id) {
      return bank.account_id;
    }
    // Legacy / mid-flight: ensure a sub-account exists then use it
    if (bank) {
      const sub = await this.createCashBankSubAccount(bank, manager);
      await bankRepo.update(bank.id, { account_id: sub.id });
      return sub.id;
    }
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
    const bankRepo = manager ? manager.getRepository(BankAccount) : this.bankRepo;
    const bank = meta.bank_account_id
      ? await bankRepo.findOne({ where: { id: meta.bank_account_id } })
      : null;
    const debitNarration = bank
      ? `Bank: ${bank.bank_name || bank.name}`
      : 'Cash & Bank';
    return this.createAndPostEntry(
      {
        entry: {
          entry_date: meta.transaction_date,
          reference_no: `FUND-${meta.fund_transaction_id}`,
          description: `Fund receipt: ${meta.source_name}`,
          project_id: meta.project_id || null,
        },
        lines: [
          { account_id: debitAccountId, dr_cr: 'DEBIT', amount, narration: debitNarration },
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

  /** Recursively collect account id + all descendant ids. */
  private async getAccountIdsWithDescendants(accountId: string): Promise<string[]> {
    const all = await this.accountsRepo.find({ select: ['id', 'parent_account_id'] });
    const childrenByParent = new Map<string, string[]>();
    for (const a of all) {
      if (!a.parent_account_id) continue;
      const pid = String(a.parent_account_id);
      const list = childrenByParent.get(pid) ?? [];
      list.push(String(a.id));
      childrenByParent.set(pid, list);
    }
    const ids: string[] = [];
    const stack = [String(accountId)];
    while (stack.length) {
      const id = stack.pop()!;
      if (ids.includes(id)) continue;
      ids.push(id);
      for (const child of childrenByParent.get(id) ?? []) stack.push(child);
    }
    return ids;
  }

  private balanceSide(amount: number, creditNormal: boolean): 'Dr' | 'Cr' | '' {
    if (Math.abs(amount) < 0.0001) return '';
    if (creditNormal) return amount >= 0 ? 'Cr' : 'Dr';
    return amount >= 0 ? 'Dr' : 'Cr';
  }

  private displayBalance(signed: number): number {
    return Math.round(Math.abs(signed) * 100) / 100;
  }

  /**
   * Standard general ledger for a specific account or head account (with children).
   * Returns opening balance, period lines, running balance, and totals.
   */
  async getGeneralLedger(
    account_id: string,
    from?: string,
    to?: string,
    includeChildren?: boolean,
  ) {
    if (!account_id) throw new BadRequestException('account_id is required');

    const account = await this.accountsRepo.findOne({ where: { id: account_id } });
    if (!account) throw new NotFoundException('Account not found');

    const childCount = await this.accountsRepo.count({
      where: { parent_account_id: account_id },
    });
    const isHead = childCount > 0;
    const rollup = includeChildren === undefined ? isHead : includeChildren;
    const accountIds = rollup
      ? await this.getAccountIdsWithDescendants(account_id)
      : [String(account_id)];

    const creditNormal = ['LIABILITY', 'EQUITY', 'INCOME'].includes(account.type);

    // Opening balance (activity before `from`)
    let openingSigned = 0;
    if (from) {
      const opening = await this.jelRepo
        .createQueryBuilder('l')
        .innerJoin('l.journal_entry', 'je')
        .where('l.account_id IN (:...ids)', { ids: accountIds })
        .andWhere('je.status = :status', { status: 'Posted' })
        .andWhere('je.entry_date < :from', { from })
        .select(
          `COALESCE(SUM(CASE WHEN l.dr_cr='DEBIT' THEN CAST(l.amount AS NUMERIC) ELSE 0 END), 0)`,
          'total_debit',
        )
        .addSelect(
          `COALESCE(SUM(CASE WHEN l.dr_cr='CREDIT' THEN CAST(l.amount AS NUMERIC) ELSE 0 END), 0)`,
          'total_credit',
        )
        .getRawOne();
      const od = Number(opening?.total_debit ?? 0);
      const oc = Number(opening?.total_credit ?? 0);
      openingSigned = creditNormal ? oc - od : od - oc;
    }

    const q = this.jelRepo
      .createQueryBuilder('l')
      .innerJoin('l.journal_entry', 'je')
      .innerJoin('l.account', 'a')
      .where('l.account_id IN (:...ids)', { ids: accountIds })
      .andWhere('je.status = :status', { status: 'Posted' })
      .orderBy('je.entry_date', 'ASC')
      .addOrderBy('je.id', 'ASC')
      .addOrderBy('l.id', 'ASC')
      // Cast to text so Node does not shift DATE into a UTC Date (wrong day in PKT)
      .select(`TO_CHAR(je.entry_date::date, 'YYYY-MM-DD')`, 'entry_date')
      .addSelect('je.reference_no', 'reference_no')
      .addSelect('je.description', 'description')
      .addSelect('l.narration', 'narration')
      .addSelect('je.id', 'journal_entry_id')
      .addSelect('a.id', 'account_id')
      .addSelect('a.code', 'account_code')
      .addSelect('a.name', 'account_name')
      .addSelect(`CASE WHEN l.dr_cr='DEBIT' THEN CAST(l.amount AS NUMERIC) ELSE 0 END`, 'debit')
      .addSelect(`CASE WHEN l.dr_cr='CREDIT' THEN CAST(l.amount AS NUMERIC) ELSE 0 END`, 'credit');
    if (from) q.andWhere('je.entry_date >= :from', { from });
    if (to) q.andWhere('je.entry_date <= :to', { to });

    const rawRows = await q.getRawMany();
    let running = openingSigned;
    let totalDebit = 0;
    let totalCredit = 0;

    const rows: Array<Record<string, unknown>> = [];

    if (from) {
      let openDebit = '0';
      let openCredit = '0';
      if (openingSigned > 0) {
        if (creditNormal) openCredit = String(this.displayBalance(openingSigned));
        else openDebit = String(this.displayBalance(openingSigned));
      } else if (openingSigned < 0) {
        if (creditNormal) openDebit = String(this.displayBalance(openingSigned));
        else openCredit = String(this.displayBalance(openingSigned));
      }
      rows.push({
        entry_date: from,
        reference_no: null,
        voucher_no: 'Opening',
        particular: 'Opening Balance',
        description: 'Opening Balance',
        narration: null,
        journal_entry_id: null,
        account_id: account.id,
        account_code: account.code,
        account_name: account.name,
        debit: openDebit,
        credit: openCredit,
        running_balance: this.displayBalance(running),
        balance_side: this.balanceSide(running, creditNormal),
        is_opening: true,
      });
    }

    for (const r of rawRows) {
      const debit = Number(r.debit);
      const credit = Number(r.credit);
      totalDebit += debit;
      totalCredit += credit;
      const delta = creditNormal ? credit - debit : debit - credit;
      running += delta;
      const particular =
        (r.narration && String(r.narration).trim()) ||
        (r.description && String(r.description).trim()) ||
        '-';
      rows.push({
        entry_date: r.entry_date,
        reference_no: r.reference_no,
        voucher_no: r.reference_no || (r.journal_entry_id ? `JE-${r.journal_entry_id}` : '-'),
        particular,
        description: r.description,
        narration: r.narration,
        journal_entry_id: r.journal_entry_id,
        account_id: String(r.account_id),
        account_code: r.account_code,
        account_name: r.account_name,
        debit: String(debit),
        credit: String(credit),
        running_balance: this.displayBalance(running),
        balance_side: this.balanceSide(running, creditNormal),
        is_opening: false,
      });
    }

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        is_head: isHead,
      },
      include_children: rollup,
      period: { from: from ?? null, to: to ?? null },
      opening_balance: this.displayBalance(openingSigned),
      opening_balance_side: this.balanceSide(openingSigned, creditNormal),
      rows,
      totals: {
        debit: Math.round(totalDebit * 100) / 100,
        credit: Math.round(totalCredit * 100) / 100,
        closing_balance: this.displayBalance(running),
        closing_balance_side: this.balanceSide(running, creditNormal),
      },
    };
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
    const displayName = dto.name?.trim();
    if (!displayName) {
      throw new BadRequestException('Bank display name is required');
    }
    return this.dataSource.transaction(async (manager) => {
      const cash = await this.findAccountByCode('1000', manager);
      let account_id = dto.account_id || null;

      // Explicit link to a non-parent asset is allowed; otherwise create under 1000.
      const useExplicit =
        account_id &&
        account_id !== cash.id &&
        (await manager.getRepository(Account).findOne({ where: { id: account_id } }));

      if (!useExplicit) {
        const sub = await this.createCashBankSubAccount({ ...dto, name: displayName }, manager);
        account_id = sub.id;
      } else if (useExplicit && !useExplicit.parent_account_id) {
        await manager.getRepository(Account).update(useExplicit.id, {
          parent_account_id: cash.id,
        });
      }

      const bank = await manager.getRepository(BankAccount).save(
        manager.getRepository(BankAccount).create({
          ...dto,
          name: displayName,
          account_id,
          opening_balance: dto.opening_balance ?? '0',
        }),
      );

      await this.postBankOpeningBalance(bank, account_id!, manager);
      return bank;
    });
  }

  async updateBankAccount(
    id: string,
    dto: Partial<BankAccount> & { opening_date?: string; clear_opening?: boolean },
  ) {
    const row = await this.bankRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Bank account not found');

    return this.dataSource.transaction(async (manager) => {
      const bankRepo = manager.getRepository(BankAccount);
      const accountsRepo = manager.getRepository(Account);

      const patch: Partial<BankAccount> = {};
      if (dto.name !== undefined) patch.name = dto.name;
      if (dto.bank_name !== undefined) patch.bank_name = dto.bank_name;
      if (dto.account_number !== undefined) patch.account_number = dto.account_number;
      if (dto.is_active !== undefined) patch.is_active = dto.is_active;

      const clearOpening = dto.clear_opening === true;
      const openingChanged =
        clearOpening ||
        (dto.opening_balance !== undefined &&
          Number(dto.opening_balance || 0) !== Number(row.opening_balance || 0)) ||
        dto.opening_date !== undefined;

      if (clearOpening) {
        patch.opening_balance = '0';
      } else if (dto.opening_balance !== undefined) {
        const n = Number(dto.opening_balance);
        if (Number.isNaN(n) || n < 0) {
          throw new BadRequestException('opening_balance must be a non-negative number');
        }
        patch.opening_balance = n.toFixed(2);
      }

      if (Object.keys(patch).length) {
        await bankRepo.update(id, patch);
      }

      const updated = await bankRepo.findOne({ where: { id } });
      if (!updated) throw new NotFoundException('Bank account not found');

      if (updated.account_id && (dto.name !== undefined || dto.bank_name !== undefined)) {
        await accountsRepo.update(updated.account_id, {
          name: this.bankCoaDisplayName(updated),
        });
      }

      if (openingChanged) {
        await this.syncBankOpeningBalance(updated, {
          entry_date: dto.opening_date,
          manager,
        });
      }

      return updated;
    });
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
