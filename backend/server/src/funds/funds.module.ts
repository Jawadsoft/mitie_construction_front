import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FundSource } from './entities/fund-source.entity';
import { FundTransaction } from './entities/fund-transaction.entity';
import { FundsService } from './funds.service';
import { FundsController } from './funds.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [TypeOrmModule.forFeature([FundSource, FundTransaction]), AccountingModule],
  controllers: [FundsController],
  providers: [FundsService],
  exports: [FundsService, TypeOrmModule],
})
export class FundsModule {}
