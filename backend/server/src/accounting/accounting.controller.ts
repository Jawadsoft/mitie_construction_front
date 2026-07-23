import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

const WRITE_ROLES = ['Admin', 'Owner / Director', 'Accountant'] as const;

@Controller('api/accounting')
export class AccountingController {
  constructor(private readonly svc: AccountingService) {}

  @Get('accounts') findAccounts() { return this.svc.findAccounts(); }

  @Post('accounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...WRITE_ROLES)
  createAccount(@Body() dto: any) { return this.svc.createAccount(dto); }

  @Patch('accounts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...WRITE_ROLES)
  updateAccount(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateAccount(id, dto);
  }

  @Get('journal') findJournalEntries(@Query('project_id') project_id?: string) {
    return this.svc.findJournalEntries(project_id);
  }
  @Get('journal/:id') findJournalEntry(@Param('id') id: string) {
    return this.svc.findJournalEntry(id);
  }

  @Post('journal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...WRITE_ROLES)
  createJournalEntry(@Body() dto: any) {
    return this.svc.createJournalEntry(dto);
  }

  @Post('journal/purge-orphans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...WRITE_ROLES)
  purgeOrphanAutoJournals() {
    return this.svc.purgeOrphanAutoJournals();
  }

  @Post('journal/:id/post')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...WRITE_ROLES)
  postJournalEntry(@Param('id') id: string) {
    return this.svc.postJournalEntry(id);
  }

  @Delete('journal/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...WRITE_ROLES)
  deleteJournalEntry(@Param('id') id: string) {
    return this.svc.deleteJournalEntry(id);
  }

  @Get('reports/trial-balance') getTrialBalance(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.getTrialBalance(from, to);
  }

  @Get('reports/general-ledger') getGeneralLedger(
    @Query('account_id') account_id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.getGeneralLedger(account_id, from, to);
  }

  @Get('reports/balance-sheet') getBalanceSheet(@Query('as_of') as_of?: string) {
    return this.svc.getBalanceSheet(as_of);
  }

  @Get('bank-accounts') findBankAccounts() { return this.svc.findBankAccounts(); }

  @Post('bank-accounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...WRITE_ROLES)
  createBankAccount(@Body() dto: any) {
    return this.svc.createBankAccount(dto);
  }

  @Patch('bank-accounts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...WRITE_ROLES)
  updateBankAccount(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateBankAccount(id, dto);
  }

  @Get('bank-accounts/:id/statements') getStatementLines(@Param('id') id: string) {
    return this.svc.getStatementLines(id);
  }

  @Post('bank-accounts/:id/statements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...WRITE_ROLES)
  createStatementLines(
    @Param('id') id: string,
    @Body() dto: { lines: any[] },
  ) {
    return this.svc.createStatementLines(id, dto.lines || []);
  }

  @Patch('statement-lines/:id/match')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...WRITE_ROLES)
  matchStatementLine(
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.svc.matchStatementLine(id, dto);
  }

  @Get('reconciliations') findReconciliations(@Query('bank_account_id') bank_account_id?: string) {
    return this.svc.findReconciliations(bank_account_id);
  }

  @Post('reconciliations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...WRITE_ROLES)
  createReconciliation(@Body() dto: any) {
    return this.svc.createReconciliation(dto);
  }

  @Post('reconciliations/:id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...WRITE_ROLES)
  completeReconciliation(@Param('id') id: string) {
    return this.svc.completeReconciliation(id);
  }
}
