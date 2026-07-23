import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { BankAccount } from './entities/bank-account.entity';
import { BankStatementLine } from './entities/bank-statement-line.entity';
import { BankReconciliation } from './entities/bank-reconciliation.entity';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Account,
      JournalEntry,
      JournalEntryLine,
      BankAccount,
      BankStatementLine,
      BankReconciliation,
    ]),
  ],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService, TypeOrmModule],
})
export class AccountingModule {}
