"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const health_module_1 = require("./health/health.module");
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const projects_module_1 = require("./projects/projects.module");
const suppliers_module_1 = require("./suppliers/suppliers.module");
const labour_module_1 = require("./labour/labour.module");
const expenses_module_1 = require("./expenses/expenses.module");
const cashflow_module_1 = require("./cashflow/cashflow.module");
const procurement_module_1 = require("./procurement/procurement.module");
const funds_module_1 = require("./funds/funds.module");
const sales_module_1 = require("./sales/sales.module");
const accounting_module_1 = require("./accounting/accounting.module");
const reports_module_1 = require("./reports/reports.module");
const inventory_module_1 = require("./inventory/inventory.module");
const settings_module_1 = require("./settings/settings.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: 'localhost',
                port: 5432,
                username: 'postgres',
                password: 'dealeriq',
                database: 'construction_erp',
                autoLoadEntities: true,
                synchronize: true,
            }),
            health_module_1.HealthModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            projects_module_1.ProjectsModule,
            suppliers_module_1.SuppliersModule,
            labour_module_1.LabourModule,
            expenses_module_1.ExpensesModule,
            cashflow_module_1.CashflowModule,
            procurement_module_1.ProcurementModule,
            funds_module_1.FundsModule,
            sales_module_1.SalesModule,
            accounting_module_1.AccountingModule,
            reports_module_1.ReportsModule,
            inventory_module_1.InventoryModule,
            settings_module_1.SettingsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map