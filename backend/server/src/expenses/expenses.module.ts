import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity';
import { ExpensePayment } from './entities/expense-payment.entity';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { AccountingModule } from '../accounting/accounting.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Expense, ExpensePayment]),
    AccountingModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService, TypeOrmModule],
})
export class ExpensesModule {}
