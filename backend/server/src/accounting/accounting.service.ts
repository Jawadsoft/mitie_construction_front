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
    const params: unknown[] = [];
    let where = '';
    if (project_id) {
      params.push(project_id);
      where = `WHERE je.project_id = $${params.length}`;
    }
    const rows: Array<Record<string, unknown>> = await this.dataSource.query(
      `
      SELECT
        je.id::text AS id,
        je.entry_date::text AS entry_date,
        je.reference_no,
        je.description,
        je.status,
        je.project_id::text AS project_id,
        je.created_at,
        je.updated_at,
        COALESCE(SUM(CASE WHEN l.dr_cr = 'DEBIT' THEN l.amount ELSE 0 END), 0)::text AS total_debit,
        COALESCE(SUM(CASE WHEN l.dr_cr = 'CREDIT' THEN l.amount ELSE 0 END), 0)::text AS total_credit
      FROM journal_entries je
      LEFT JOIN journal_entry_lines l ON l.journal_entry_id = je.id
      ${where}
      GROUP BY je.id
      ORDER BY je.entry_date DESC, je.id DESC
      `,
      params,
    );
    return rows;
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

  async deleteJournalEntry(id: string, manager?: EntityManager) {
    const jeRepo = manager ? manager.getRepository(JournalEntry) : this.jeRepo;
    const jelRepo = manager ? manager.getRepository(JournalEntryLine) : this.jelRepo;
    const stmtRepo = manager ? manager.getRepository(BankStatementLine) : this.stmtRepo;
    const je = await jeRepo.findOne({ where: { id } });
    if (!je) {
      if (manager) return { deleted: false };
      throw new NotFoundException('Journal entry not found');
    }
    await stmtRepo
      .createQueryBuilder()
      .update(BankStatementLine)
      .set({ journal_entry_id: null })
      .where('journal_entry_id = :id', { id })
      .execute();
    await jelRepo.delete({ journal_entry_id: id });
    await jeRepo.delete(id);
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
          AND je.reference_no NOT LIKE 'EXPPMT-%'
          AND NOT EXISTS (
            SELECT 1 FROM expenses e
            WHERE e.id::text = SUBSTRING(je.reference_no FROM 5)
          ))
        OR (je.reference_no LIKE 'SALE-%'
          AND NOT EXISTS (
            SELECT 1 FROM sales s
            WHERE s.id::text = SUBSTRING(je.reference_no FROM 6)
               AND s.status <> 'Cancelled'
          ))
        OR (je.reference_no LIKE 'PMT-%'
          AND NOT EXISTS (
            SELECT 1 FROM sale_installments si
            WHERE si.id::text = SPLIT_PART(SUBSTRING(je.reference_no FROM 5), '-', 1)
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
        OR (je.reference_no LIKE 'BANK-OPEN-%'
          AND NOT EXISTS (
            SELECT 1 FROM bank_accounts ba
            WHERE ba.id::text = SUBSTRING(je.reference_no FROM 11)
          ))
    `);

    let deleted = 0;
    for (const row of orphans) {
      await this.deleteJournalEntry(row.id);
      deleted += 1;
    }
    return { deleted, references: orphans.map((o) => o.reference_no) };
  }

  private toDateOnly(value: string | Date | null | undefined): string {
    if (value == null || value === '') return new Date().toISOString().slice(0, 10);
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return new Date().toISOString().slice(0, 10);
      // node-pg returns DATE as JS Date at UTC midnight
      const y = value.getUTCFullYear();
      const m = String(value.getUTCMonth() + 1).padStart(2, '0');
      const d = String(value.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const s = String(value).trim();
    const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) return this.toDateOnly(parsed);
    return new Date().toISOString().slice(0, 10);
  }

  private matchBankIdFromNarration(
    narration: string | null | undefined,
    banks: BankAccount[],
  ): string | null {
    if (!narration) return null;
    const m = String(narration).match(/^Bank:\s*(.+)$/i);
    const needle = (m ? m[1] : narration).trim().toLowerCase();
    if (!needle || needle === 'cash received' || needle === 'cash & bank') return null;
    const hit = banks.find((b) => {
      const names = [b.bank_name, b.name, `${b.bank_name || ''} — ${b.name || ''}`]
        .filter(Boolean)
        .map((x) => String(x).trim().toLowerCase());
      return names.some((n) => n === needle || needle.includes(n) || n.includes(needle));
    });
    return hit?.id ?? null;
  }

  /**
   * Resolve which partner bank a collection (PMT) should post to.
   * Prefers prior JE debit sub-account, then "Bank: …" narration, then project fund bank,
   * then optional default.
   */
  private async resolveCollectionBankId(
    installmentId: string,
    projectId: string | null | undefined,
    banks: BankAccount[],
    cashAccountId: string,
    defaultBankId?: string | null,
  ): Promise<string | null> {
    const priorLines: Array<{ account_id: string; narration: string | null }> =
      await this.dataSource.query(
        `
        SELECT l.account_id::text AS account_id, l.narration
        FROM journal_entry_lines l
        INNER JOIN journal_entries je ON je.id = l.journal_entry_id
        WHERE (je.reference_no = $1 OR je.reference_no LIKE $2)
          AND l.dr_cr = 'DEBIT'
        ORDER BY je.id DESC
        LIMIT 10
        `,
        [`PMT-${installmentId}`, `PMT-${installmentId}-%`],
      );

    for (const line of priorLines) {
      if (line.account_id && String(line.account_id) !== String(cashAccountId)) {
        const byCoa = banks.find((b) => String(b.account_id) === String(line.account_id));
        if (byCoa) return byCoa.id;
      }
      const byNarr = this.matchBankIdFromNarration(line.narration, banks);
      if (byNarr) return byNarr;
    }

    if (projectId) {
      const projectBanks: Array<{ bank_account_id: string }> = await this.dataSource.query(
        `
        SELECT DISTINCT fs.bank_account_id::text AS bank_account_id
        FROM fund_sources fs
        WHERE fs.project_id = $1 AND fs.bank_account_id IS NOT NULL
        `,
        [projectId],
      );
      if (projectBanks.length === 1) return projectBanks[0].bank_account_id;
    }

    if (defaultBankId && banks.some((b) => String(b.id) === String(defaultBankId))) {
      return String(defaultBankId);
    }

    // Single partner bank in the system → safe default for legacy cash-on-parent PMTs
    if (banks.length === 1) return banks[0].id;

    return null;
  }

  /**
   * Rebuild all voucher-linked journals from source documents, purge orphans,
   * sync bank openings / fund dates, and reindex PMT refs to stable PMT-{installmentId}.
   * Collections (PMT) are posted to the resolved partner bank COA child under 1000.
   */
  async rebuildAllVoucherJournals(opts?: {
    apply?: boolean;
    /** Fallback bank for collections that have no bank signal */
    default_collection_bank_id?: string | null;
  }) {
    const apply = opts?.apply !== false;
    const report: {
      mode: 'apply' | 'dry-run';
      orphans_purged: number;
      orphan_refs: string[];
      bank_openings_synced: number;
      expenses_rebuilt: number;
      expense_payments_rebuilt: number;
      sales_rebuilt: number;
      payments_rebuilt: number;
      payments_to_bank: number;
      payments_left_on_cash: string[];
      funds_rebuilt: number;
      parent_cash_lines_moved: number;
      missing_before: Record<string, number>;
      unbalanced_after: Array<{ id: string; reference_no: string; debit: string; credit: string }>;
      errors: string[];
    } = {
      mode: apply ? 'apply' : 'dry-run',
      orphans_purged: 0,
      orphan_refs: [],
      bank_openings_synced: 0,
      expenses_rebuilt: 0,
      expense_payments_rebuilt: 0,
      sales_rebuilt: 0,
      payments_rebuilt: 0,
      payments_to_bank: 0,
      payments_left_on_cash: [],
      funds_rebuilt: 0,
      parent_cash_lines_moved: 0,
      missing_before: {},
      unbalanced_after: [],
      errors: [],
    };

    const missing = await this.dataSource.query(`
      SELECT 'EXP' AS kind, COUNT(*)::int AS cnt FROM expenses e
        WHERE NOT EXISTS (SELECT 1 FROM journal_entries je WHERE je.reference_no = 'EXP-' || e.id::text)
      UNION ALL
      SELECT 'SALE', COUNT(*)::int FROM sales s
        WHERE s.status <> 'Cancelled'
          AND NOT EXISTS (SELECT 1 FROM journal_entries je WHERE je.reference_no = 'SALE-' || s.id::text)
      UNION ALL
      SELECT 'PMT', COUNT(*)::int FROM sale_installments si
        WHERE CAST(si.paid_amount AS NUMERIC) > 0.009
          AND NOT EXISTS (
            SELECT 1 FROM journal_entries je
            WHERE je.reference_no = 'PMT-' || si.id::text
               OR je.reference_no LIKE 'PMT-' || si.id::text || '-%'
          )
      UNION ALL
      SELECT 'FUND', COUNT(*)::int FROM fund_transactions ft
        WHERE NOT EXISTS (SELECT 1 FROM journal_entries je WHERE je.reference_no = 'FUND-' || ft.id::text)
      UNION ALL
      SELECT 'EXPPMT', COUNT(*)::int FROM expense_payments ep
        WHERE NOT EXISTS (SELECT 1 FROM journal_entries je WHERE je.reference_no = 'EXPPMT-' || ep.id::text)
      UNION ALL
      SELECT 'BANK-OPEN', COUNT(*)::int FROM bank_accounts ba
        WHERE CAST(ba.opening_balance AS NUMERIC) > 0.009
          AND NOT EXISTS (SELECT 1 FROM journal_entries je WHERE je.reference_no = 'BANK-OPEN-' || ba.id::text)
    `);
    for (const row of missing) {
      report.missing_before[row.kind] = Number(row.cnt);
    }

    if (!apply) {
      const orphanPreview = await this.dataSource.query(`
        SELECT je.reference_no FROM journal_entries je
        WHERE
          (je.reference_no LIKE 'EXP-%' AND je.reference_no NOT LIKE 'EXPPMT-%'
            AND NOT EXISTS (SELECT 1 FROM expenses e WHERE e.id::text = SUBSTRING(je.reference_no FROM 5)))
          OR (je.reference_no LIKE 'SALE-%'
            AND NOT EXISTS (SELECT 1 FROM sales s WHERE s.id::text = SUBSTRING(je.reference_no FROM 6) AND s.status <> 'Cancelled'))
          OR (je.reference_no LIKE 'PMT-%'
            AND NOT EXISTS (SELECT 1 FROM sale_installments si WHERE si.id::text = SPLIT_PART(SUBSTRING(je.reference_no FROM 5), '-', 1)))
          OR (je.reference_no LIKE 'FUND-%'
            AND NOT EXISTS (SELECT 1 FROM fund_transactions ft WHERE ft.id::text = SUBSTRING(je.reference_no FROM 6)))
          OR (je.reference_no LIKE 'EXPPMT-%'
            AND NOT EXISTS (SELECT 1 FROM expense_payments ep WHERE ep.id::text = SUBSTRING(je.reference_no FROM 8)))
          OR (je.reference_no LIKE 'BANK-OPEN-%'
            AND NOT EXISTS (SELECT 1 FROM bank_accounts ba WHERE ba.id::text = SUBSTRING(je.reference_no FROM 11)))
      `);
      report.orphan_refs = orphanPreview.map((r: { reference_no: string }) => r.reference_no);
      report.orphans_purged = report.orphan_refs.length;
      return report;
    }

    // 1) Purge unlinked voucher journals
    const purged = await this.purgeOrphanAutoJournals();
    report.orphans_purged = purged.deleted;
    report.orphan_refs = purged.references;

    // 2) Ensure partner banks have COA children; sync openings
    await this.ensureBankCoaSubAccounts();
    let banks = await this.bankRepo.find();
    const cash = await this.findAccountByCode('1000');
    for (const bank of banks) {
      try {
        const fresh = await this.bankRepo.findOne({ where: { id: bank.id } });
        if (!fresh?.account_id) continue;
        await this.syncBankOpeningBalance(fresh);
        report.bank_openings_synced += 1;
      } catch (err: any) {
        report.errors.push(`BANK-OPEN-${bank.id}: ${err?.message || err}`);
      }
    }
    banks = await this.bankRepo.find();

    // 3) Expenses
    const expenses: Expense[] = await this.dataSource.query(`SELECT * FROM expenses ORDER BY id`);
    for (const expense of expenses) {
      try {
        const normalized = {
          ...expense,
          expense_date: this.toDateOnly(expense.expense_date as any),
        };
        await this.dataSource.transaction(async (manager) => {
          await this.deleteJournalByReference(`EXP-${expense.id}`, manager);
          await this.postExpenseJournal(normalized, manager);
        });
        report.expenses_rebuilt += 1;
      } catch (err: any) {
        report.errors.push(`EXP-${expense.id}: ${err?.message || err}`);
      }
    }

    // 4) Expense bill payments
    const expPayments: Array<{
      id: string;
      expense_id: string;
      paid_date: string;
      amount: string;
      payment_method: string;
      bank_account_id: string | null;
    }> = await this.dataSource.query(`SELECT * FROM expense_payments ORDER BY id`);
    for (const payment of expPayments) {
      try {
        const expense = expenses.find((e) => String(e.id) === String(payment.expense_id));
        if (!expense) continue;
        await this.dataSource.transaction(async (manager) => {
          await this.deleteJournalByReference(`EXPPMT-${payment.id}`, manager);
          await this.postExpenseBillPaymentJournal(
            { ...expense, expense_date: this.toDateOnly(expense.expense_date as any) },
            { ...payment, paid_date: this.toDateOnly(payment.paid_date as any) },
            manager,
          );
        });
        report.expense_payments_rebuilt += 1;
      } catch (err: any) {
        report.errors.push(`EXPPMT-${payment.id}: ${err?.message || err}`);
      }
    }

    // 5) Sales (+ project link)
    const sales: Array<Sale & { project_id?: string | null }> = await this.dataSource.query(`
      SELECT s.*, pu.project_id
      FROM sales s
      LEFT JOIN property_units pu ON pu.id = s.property_unit_id
      WHERE s.status <> 'Cancelled'
      ORDER BY s.id
    `);
    for (const sale of sales) {
      try {
        await this.dataSource.transaction(async (manager) => {
          await this.deleteJournalByReference(`SALE-${sale.id}`, manager);
          await this.postSaleJournal(
            { ...sale, sale_date: this.toDateOnly(sale.sale_date as any) },
            sale.project_id ?? null,
            manager,
          );
        });
        report.sales_rebuilt += 1;
      } catch (err: any) {
        report.errors.push(`SALE-${sale.id}: ${err?.message || err}`);
      }
    }

    // 6) Collection payments — consolidate to stable PMT-{installmentId}
    // Prefer bank_account_id stored on sale_installments (collection table).
    const installments: Array<{
      id: string;
      sale_id: string;
      paid_amount: string;
      paid_date: string | null;
      bank_account_id: string | null;
      project_id: string | null;
    }> = await this.dataSource.query(`
      SELECT si.id, si.sale_id, si.paid_amount, si.paid_date,
             si.bank_account_id, pu.project_id
      FROM sale_installments si
      INNER JOIN sales s ON s.id = si.sale_id
      LEFT JOIN property_units pu ON pu.id = s.property_unit_id
      WHERE s.status <> 'Cancelled'
      ORDER BY si.id
    `);

    for (const inst of installments) {
      try {
        const paid = Number(inst.paid_amount || 0);
        const sale = sales.find((s) => String(s.id) === String(inst.sale_id));
        if (!sale) {
          await this.deleteJournalsByReferencePrefix(`PMT-${inst.id}`);
          continue;
        }

        let bank_account_id: string | null = inst.bank_account_id
          ? String(inst.bank_account_id)
          : null;
        if (bank_account_id && !banks.some((b) => String(b.id) === bank_account_id)) {
          bank_account_id = null;
        }
        if (!bank_account_id) {
          bank_account_id = await this.resolveCollectionBankId(
            String(inst.id),
            inst.project_id,
            banks,
            cash.id,
            opts?.default_collection_bank_id,
          );
        }

        await this.dataSource.transaction(async (manager) => {
          await this.deleteJournalsByReferencePrefix(`PMT-${inst.id}`, manager);
          if (!(paid > 0.009)) return;
          await this.postSalePaymentJournal(
            { ...sale, sale_date: this.toDateOnly(sale.sale_date as any) },
            paid.toFixed(2),
            {
              installment_id: String(inst.id),
              paid_date: this.toDateOnly((inst.paid_date || sale.sale_date) as any),
              project_id: inst.project_id,
              bank_account_id,
              reference_no: `PMT-${inst.id}`,
            },
            manager,
          );
        });
        if (paid > 0.009) {
          report.payments_rebuilt += 1;
          if (bank_account_id) report.payments_to_bank += 1;
          else report.payments_left_on_cash.push(`PMT-${inst.id}`);
        }
      } catch (err: any) {
        report.errors.push(`PMT-${inst.id}: ${err?.message || err}`);
      }
    }

    // 7) Fund receipts
    const funds: Array<{
      id: string;
      fund_source_id: string;
      transaction_date: string;
      amount: string;
      source_name: string;
      source_type: string;
      bank_account_id: string | null;
      project_id: string | null;
    }> = await this.dataSource.query(`
      SELECT ft.id, ft.fund_source_id, ft.transaction_date, ft.amount,
             fs.source_name, fs.source_type, fs.bank_account_id, fs.project_id
      FROM fund_transactions ft
      INNER JOIN fund_sources fs ON fs.id = ft.fund_source_id
      ORDER BY ft.id
    `);
    for (const ft of funds) {
      try {
        await this.dataSource.transaction(async (manager) => {
          await this.deleteJournalByReference(`FUND-${ft.id}`, manager);
          await this.postFundReceiptJournal(
            {
              fund_transaction_id: String(ft.id),
              fund_source_id: String(ft.fund_source_id),
              source_name: ft.source_name,
              source_type: ft.source_type,
              bank_account_id: ft.bank_account_id,
              project_id: ft.project_id,
              transaction_date: this.toDateOnly(ft.transaction_date as any),
              amount: ft.amount,
            },
            manager,
          );
        });
        report.funds_rebuilt += 1;
      } catch (err: any) {
        report.errors.push(`FUND-${ft.id}: ${err?.message || err}`);
      }
    }

    // 8) Move remaining mappable parent-1000 lines onto bank sub-accounts
    banks = await this.bankRepo.find();
    const parentMoves: Array<{ line_id: string; bank_id: string }> = await this.dataSource.query(
      `
      SELECT l.id::text AS line_id, e.bank_account_id::text AS bank_id
      FROM journal_entry_lines l
      INNER JOIN journal_entries je ON je.id = l.journal_entry_id
      INNER JOIN expenses e ON je.reference_no = 'EXP-' || e.id::text
      WHERE l.account_id = $1 AND e.bank_account_id IS NOT NULL
      UNION ALL
      SELECT l.id::text, ep.bank_account_id::text
      FROM journal_entry_lines l
      INNER JOIN journal_entries je ON je.id = l.journal_entry_id
      INNER JOIN expense_payments ep ON je.reference_no = 'EXPPMT-' || ep.id::text
      WHERE l.account_id = $1 AND ep.bank_account_id IS NOT NULL
      UNION ALL
      SELECT l.id::text, fs.bank_account_id::text
      FROM journal_entry_lines l
      INNER JOIN journal_entries je ON je.id = l.journal_entry_id
      INNER JOIN fund_transactions ft ON je.reference_no = 'FUND-' || ft.id::text
      INNER JOIN fund_sources fs ON fs.id = ft.fund_source_id
      WHERE l.account_id = $1 AND fs.bank_account_id IS NOT NULL
      `,
      [cash.id],
    );
    for (const mv of parentMoves) {
      const bank = banks.find((b) => String(b.id) === String(mv.bank_id));
      if (!bank?.account_id || String(bank.account_id) === String(cash.id)) continue;
      await this.dataSource.query(`UPDATE journal_entry_lines SET account_id = $1 WHERE id = $2`, [
        bank.account_id,
        mv.line_id,
      ]);
      report.parent_cash_lines_moved += 1;
    }

    // 8b) Any PMT still on parent 1000 with Bank: narration → move to that sub-account
    const pmtOnParent: Array<{ line_id: string; narration: string | null }> =
      await this.dataSource.query(
        `
        SELECT l.id::text AS line_id, l.narration
        FROM journal_entry_lines l
        INNER JOIN journal_entries je ON je.id = l.journal_entry_id
        WHERE l.account_id = $1
          AND l.dr_cr = 'DEBIT'
          AND je.reference_no LIKE 'PMT-%'
        `,
        [cash.id],
      );
    for (const row of pmtOnParent) {
      const bankId = this.matchBankIdFromNarration(row.narration, banks);
      const bank = bankId ? banks.find((b) => String(b.id) === String(bankId)) : null;
      if (!bank?.account_id || String(bank.account_id) === String(cash.id)) continue;
      await this.dataSource.query(`UPDATE journal_entry_lines SET account_id = $1 WHERE id = $2`, [
        bank.account_id,
        row.line_id,
      ]);
      report.parent_cash_lines_moved += 1;
    }

    // 9) Unbalanced posted journals
    report.unbalanced_after = await this.dataSource.query(`
      SELECT je.id::text AS id, je.reference_no,
             COALESCE(SUM(CASE WHEN l.dr_cr = 'DEBIT' THEN l.amount ELSE 0 END), 0)::text AS debit,
             COALESCE(SUM(CASE WHEN l.dr_cr = 'CREDIT' THEN l.amount ELSE 0 END), 0)::text AS credit
      FROM journal_entries je
      LEFT JOIN journal_entry_lines l ON l.journal_entry_id = je.id
      WHERE je.status = 'Posted'
      GROUP BY je.id, je.reference_no
      HAVING ABS(
        COALESCE(SUM(CASE WHEN l.dr_cr = 'DEBIT' THEN l.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN l.dr_cr = 'CREDIT' THEN l.amount ELSE 0 END), 0)
      ) > 0.009
    `);

    return report;
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
      /** Stable voucher ref; default PMT-{installment}-{unique} */
      reference_no?: string;
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

    const reference_no =
      meta.reference_no ||
      `PMT-${meta.installment_id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    return this.createAndPostEntry(
      {
        entry: {
          entry_date: meta.paid_date,
          reference_no,
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

  async postLabourPaymentJournal(
    payment: {
      id: string;
      contractor_id: string;
      project_id: string;
      payment_date: string;
      amount: string | number;
      payment_method?: string | null;
      notes?: string | null;
      contractor_name?: string | null;
      bank_account_id?: string | null;
    },
    manager?: EntityManager,
  ) {
    const labourAcc = await this.findAccountByCode('5100', manager);
    const cashId = await this.resolveBankAssetAccountId(payment.bank_account_id, manager);
    const amount = Number(payment.amount).toFixed(2);
    const who = payment.contractor_name || `contractor ${payment.contractor_id}`;
    return this.createAndPostEntry(
      {
        entry: {
          entry_date: payment.payment_date,
          reference_no: `LABOUR-${payment.id}`,
          description: payment.notes || `Labour payment: ${who}`,
          project_id: payment.project_id || null,
        },
        lines: [
          {
            account_id: labourAcc.id,
            dr_cr: 'DEBIT',
            amount,
            narration: payment.payment_method || 'Labour',
          },
          {
            account_id: cashId,
            dr_cr: 'CREDIT',
            amount,
            narration: payment.payment_method || 'Cash payment',
          },
        ],
      },
      manager,
    );
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
      .leftJoin('projects', 'p', 'p.id = je.project_id')
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
      .addSelect('je.project_id', 'project_id')
      .addSelect('p.name', 'project_name')
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
        project_id: null,
        project_name: null,
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
        project_id: r.project_id != null ? String(r.project_id) : null,
        project_name: r.project_name ?? null,
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
