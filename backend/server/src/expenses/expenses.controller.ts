import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';

@Controller('api/expenses')
export class ExpensesController {
  constructor(private readonly svc: ExpensesService) {}

  @Get()
  findAll(
    @Query('project_id') project_id?: string,
    @Query('project_stage_id') project_stage_id?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('entry_mode') entry_mode?: string,
  ) {
    return this.svc.findAll({ project_id, project_stage_id, category, status, entry_mode });
  }

  @Get('summary')
  getSummary(@Query('project_id') project_id?: string) {
    return this.svc.getSummary(project_id);
  }

  @Get(':id/payments')
  findPayments(@Param('id') id: string) {
    return this.svc.findPayments(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.svc.create(dto);
  }

  @Post(':id/pay')
  payBill(@Param('id') id: string, @Body() dto: any) {
    return this.svc.payBill(id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
