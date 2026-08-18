import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: any, @Req() req: { user?: { userId?: string } }) {
    return this.svc.create(dto, req.user?.userId);
  }

  @Post(':id/pay')
  @UseGuards(JwtAuthGuard)
  payBill(@Param('id') id: string, @Body() dto: any) {
    return this.svc.payBill(id, dto);
  }

  @Patch(':id/payments/:paymentId')
  @UseGuards(JwtAuthGuard)
  updatePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: any,
  ) {
    return this.svc.updatePayment(id, paymentId, dto);
  }

  @Delete(':id/payments/:paymentId')
  @UseGuards(JwtAuthGuard)
  removePayment(@Param('id') id: string, @Param('paymentId') paymentId: string) {
    return this.svc.removePayment(id, paymentId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: { user?: { userId?: string } },
  ) {
    return this.svc.update(id, dto, req.user?.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
