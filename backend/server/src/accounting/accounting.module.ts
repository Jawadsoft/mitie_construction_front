import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Account, JournalEntry, JournalEntryLine])],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService, TypeOrmModule],
})
export class AccountingModule {}
