import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AccountingService } from './accounting.service';

@Controller('api/accounting')
export class AccountingController {
  constructor(private readonly svc: AccountingService) {}

  @Get('accounts') findAccounts() { return this.svc.findAccounts(); }
  @Post('accounts') createAccount(@Body() dto: any) { return this.svc.createAccount(dto); }

  @Get('journal') findJournalEntries(@Query('project_id') project_id?: string) { return this.svc.findJournalEntries(project_id); }
  @Get('journal/:id') findJournalEntry(@Param('id') id: string) { return this.svc.findJournalEntry(id); }
  @Post('journal') createJournalEntry(@Body() dto: any) { return this.svc.createJournalEntry(dto); }

  @Get('reports/trial-balance') getTrialBalance() { return this.svc.getTrialBalance(); }
}
