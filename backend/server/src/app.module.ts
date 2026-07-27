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
import { LandModule } from './land/land.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(process.env.DATABASE_URL
        ? { url: process.env.DATABASE_URL }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 5432,
            username: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'dealeriq',
            database: process.env.DB_NAME || 'construction_erp',
          }),
      // Render Postgres requires TLS (internal + external)
      ssl:
        process.env.DATABASE_URL ||
        process.env.NODE_ENV === 'production' ||
        process.env.DB_SSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
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
    LandModule,
    SearchModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
