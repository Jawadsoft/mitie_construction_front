import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { FundsService } from './funds.service';

@Controller('api/funds')
export class FundsController {
  constructor(private readonly svc: FundsService) {}

  @Get('sources') findSources(@Query('project_id') project_id?: string) { return this.svc.findSources(project_id); }
  @Get('sources/:id') findOneSource(@Param('id') id: string) { return this.svc.findOneSource(id); }
  @Post('sources') createSource(@Body() dto: any) { return this.svc.createSource(dto); }
  @Patch('sources/:id') updateSource(@Param('id') id: string, @Body() dto: any) { return this.svc.updateSource(id, dto); }
  @Delete('sources/:id') deleteSource(@Param('id') id: string) { return this.svc.deleteSource(id); }

  @Get('transactions') findTransactions(@Query('fund_source_id') fund_source_id?: string) { return this.svc.findTransactions(fund_source_id); }
  @Post('transactions') createTransaction(@Body() dto: any) { return this.svc.createTransaction(dto); }
  @Patch('transactions/:id') updateTransaction(@Param('id') id: string, @Body() dto: any) { return this.svc.updateTransaction(id, dto); }
  @Delete('transactions/:id') deleteTransaction(@Param('id') id: string) { return this.svc.deleteTransaction(id); }
}
