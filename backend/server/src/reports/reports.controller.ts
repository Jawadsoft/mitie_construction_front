import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('api/reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('budget-vs-actual')
  getBudgetVsActual(@Query('project_id') project_id?: string) {
    return this.svc.getBudgetVsActual(project_id);
  }

  @Get('stage-budget/:project_id')
  getStageBudget(@Param('project_id') project_id: string) {
    return this.svc.getStageBudgetVsActual(project_id);
  }

  @Get('profitability')
  getProfitability(@Query('project_id') project_id?: string) {
    return this.svc.getProjectProfitability(project_id);
  }

  @Get('profit-loss')
  getProfitLoss(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.getProfitLoss(from, to);
  }

  @Get('partners-equity')
  getPartnersEquity(@Query('as_of') as_of?: string) {
    return this.svc.getPartnersEquity(as_of);
  }

  @Get('supplier-payables')
  getSupplierPayables(@Query('project_id') project_id?: string) {
    return this.svc.getSupplierPayables(project_id);
  }

  @Get('receivables')
  getReceivables(@Query('project_id') project_id?: string) {
    return this.svc.getReceivablesAging(project_id);
  }

  @Get('labour-cost')
  getLabourCost(@Query('project_id') project_id?: string) {
    return this.svc.getLabourCost(project_id);
  }

  @Get('cashflow')
  getCashflow(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.getCashflowReport(period, from, to);
  }

  @Get('expenses')
  getExpenses(@Query('project_id') project_id?: string) {
    return this.svc.getExpenseBreakdown(project_id);
  }
}
