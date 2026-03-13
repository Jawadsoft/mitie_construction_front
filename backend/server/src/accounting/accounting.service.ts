import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';

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

@Injectable()
export class AccountingService implements OnModuleInit {
  constructor(
    @InjectRepository(Account) private readonly accountsRepo: Repository<Account>,
    @InjectRepository(JournalEntry) private readonly jeRepo: Repository<JournalEntry>,
    @InjectRepository(JournalEntryLine) private readonly jelRepo: Repository<JournalEntryLine>,
  ) {}

  async onModuleInit() {
    for (const acc of SEED_ACCOUNTS) {
      const exists = await this.accountsRepo.findOne({ where: { code: acc.code } });
      if (!exists) {
        await this.accountsRepo.save(this.accountsRepo.create(acc));
      }
    }
  }

  findAccounts() { return this.accountsRepo.find({ where: { is_active: true }, order: { code: 'ASC' } }); }
  createAccount(dto: Partial<Account>) { return this.accountsRepo.save(this.accountsRepo.create(dto)); }

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

  async createJournalEntry(dto: { entry: Partial<JournalEntry>; lines: Partial<JournalEntryLine>[] }) {
    const debits = dto.lines.filter(l => l.dr_cr === 'DEBIT').reduce((s, l) => s + Number(l.amount), 0);
    const credits = dto.lines.filter(l => l.dr_cr === 'CREDIT').reduce((s, l) => s + Number(l.amount), 0);
    if (Math.abs(debits - credits) > 0.01) {
      throw new BadRequestException('Debits must equal credits');
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
}
