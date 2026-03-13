import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CashflowService } from './cashflow.service';

@Controller('api/cashflow')
export class CashflowController {
  constructor(private readonly svc: CashflowService) {}

  @Get() findAll(@Query('project_id') project_id?: string, @Query('type') type?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.findAll({ project_id, type, from, to });
  }
  @Post() create(@Body() dto: any) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
  @Get('summary') getSummary(@Query('from') from?: string, @Query('to') to?: string) { return this.svc.getSummary(from, to); }
  @Get('dashboard') getDashboard() { return this.svc.getDashboardStats(); }
}
