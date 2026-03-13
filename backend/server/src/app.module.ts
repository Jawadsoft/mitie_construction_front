import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { LabourModule } from './labour/labour.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CashflowModule } from './cashflow/cashflow.module';
import { ProcurementModule } from './procurement/procurement.module';
import { FundsModule } from './funds/funds.module';
import { SalesModule } from './sales/sales.module';
import { AccountingModule } from './accounting/accounting.module';
import { ReportsModule } from './reports/reports.module';
import { InventoryModule } from './inventory/inventory.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'dealeriq',
      database: 'construction_erp',
      autoLoadEntities: true,
      synchronize: true,
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    SuppliersModule,
    LabourModule,
    ExpensesModule,
    CashflowModule,
    ProcurementModule,
    FundsModule,
    SalesModule,
    AccountingModule,
    ReportsModule,
    InventoryModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
