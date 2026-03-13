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
  ) {
    return this.svc.findAll({ project_id, project_stage_id, category });
  }

  @Post()
  create(@Body() dto: any) { return this.svc.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.svc.remove(id); }

  @Get('summary')
  getSummary(@Query('project_id') project_id?: string) {
    return this.svc.getSummary(project_id);
  }
}
