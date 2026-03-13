import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { LabourService } from './labour.service';

@Controller('api/labour')
export class LabourController {
  constructor(private readonly svc: LabourService) {}

  @Get('contractors') findAllContractors() { return this.svc.findAllContractors(); }
  @Get('contractors/:id') findOneContractor(@Param('id') id: string) { return this.svc.findOneContractor(id); }
  @Post('contractors') createContractor(@Body() dto: any) { return this.svc.createContractor(dto); }
  @Patch('contractors/:id') updateContractor(@Param('id') id: string, @Body() dto: any) { return this.svc.updateContractor(id, dto); }
  @Delete('contractors/:id') deleteContractor(@Param('id') id: string) { return this.svc.deleteContractor(id); }

  @Get('attendance')
  findAttendance(@Query('project_id') project_id?: string, @Query('contractor_id') contractor_id?: string) {
    return this.svc.findAttendance({ project_id, contractor_id });
  }
  @Post('attendance') createAttendance(@Body() dto: any) { return this.svc.createAttendance(dto); }
  @Patch('attendance/:id') updateAttendance(@Param('id') id: string, @Body() dto: any) { return this.svc.updateAttendance(id, dto); }
  @Delete('attendance/:id') deleteAttendance(@Param('id') id: string) { return this.svc.deleteAttendance(id); }

  @Get('wages')
  calculateWages(@Query('project_id') project_id?: string, @Query('contractor_id') contractor_id?: string) {
    return this.svc.calculateWages(project_id, contractor_id);
  }

  @Get('payments')
  findPayments(@Query('project_id') project_id?: string, @Query('contractor_id') contractor_id?: string) {
    return this.svc.findPayments({ project_id, contractor_id });
  }
  @Post('payments') createPayment(@Body() dto: any) { return this.svc.createPayment(dto); }
  @Patch('payments/:id') updatePayment(@Param('id') id: string, @Body() dto: any) { return this.svc.updatePayment(id, dto); }
  @Delete('payments/:id') deletePayment(@Param('id') id: string) { return this.svc.deletePayment(id); }

  @Get('advances')
  findAdvances(@Query('project_id') project_id?: string, @Query('contractor_id') contractor_id?: string) {
    return this.svc.findAdvances({ project_id, contractor_id });
  }
  @Post('advances') createAdvance(@Body() dto: any) { return this.svc.createAdvance(dto); }
}
