import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashTransaction } from './entities/cash-transaction.entity';
import { CashflowService } from './cashflow.service';
import { CashflowController } from './cashflow.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [TypeOrmModule.forFeature([CashTransaction]), AccountingModule],
  controllers: [CashflowController],
  providers: [CashflowService],
  exports: [CashflowService, TypeOrmModule],
})
export class CashflowModule {}
