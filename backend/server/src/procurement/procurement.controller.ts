import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProcurementService } from './procurement.service';

@Controller('api/procurement')
export class ProcurementController {
  constructor(private readonly svc: ProcurementService) {}

  @Get() findAll(
    @Query('project_id') project_id?: string,
    @Query('status') status?: string,
    @Query('supplier_id') supplier_id?: string,
  ) { return this.svc.findAll({ project_id, status, supplier_id }); }

  @Get('receipts') getReceipts(@Query('purchase_order_id') purchase_order_id?: string) {
    return this.svc.getReceipts(purchase_order_id);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: any) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
  @Post(':id/receipts') createReceipt(@Param('id') id: string, @Body() dto: any) {
    return this.svc.createReceipt(id, dto);
  }
}
