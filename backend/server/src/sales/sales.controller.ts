import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SalesService } from './sales.service';

@Controller('api/sales')
export class SalesController {
  constructor(private readonly svc: SalesService) {}

  @Get('customers') findCustomers() { return this.svc.findCustomers(); }
  @Post('customers') createCustomer(@Body() dto: any) { return this.svc.createCustomer(dto); }
  @Patch('customers/:id') updateCustomer(@Param('id') id: string, @Body() dto: any) { return this.svc.updateCustomer(id, dto); }
  @Delete('customers/:id') deleteCustomer(@Param('id') id: string) { return this.svc.deleteCustomer(id); }

  @Get('units') findUnits(@Query('project_id') project_id?: string, @Query('status') status?: string) {
    return this.svc.findUnits(project_id, status);
  }
  @Post('units') createUnit(@Body() dto: any) { return this.svc.createUnit(dto); }
  @Patch('units/:id') updateUnit(@Param('id') id: string, @Body() dto: any) { return this.svc.updateUnit(id, dto); }
  @Delete('units/:id') deleteUnit(@Param('id') id: string) { return this.svc.deleteUnit(id); }

  @Get('list') findSales(@Query('project_id') project_id?: string, @Query('customer_id') customer_id?: string) { return this.svc.findSales(project_id, customer_id); }
  @Get('list/:id') findOneSale(@Param('id') id: string) { return this.svc.findOneSale(id); }
  @Post('list') createSale(@Body() dto: any) { return this.svc.createSale(dto); }
  @Patch('list/:id') updateSale(@Param('id') id: string, @Body() dto: any) { return this.svc.updateSale(id, dto); }
  @Delete('list/:id') deleteSale(@Param('id') id: string) { return this.svc.deleteSale(id); }

  @Get('installments') findInstallments(@Query('sale_id') sale_id?: string, @Query('status') status?: string) {
    return this.svc.findInstallments(sale_id, status);
  }
  @Post('installments/:id/pay') recordPayment(@Param('id') id: string, @Body() dto: any) {
    return this.svc.recordPayment(id, dto.paid_amount, dto.paid_date);
  }
}
