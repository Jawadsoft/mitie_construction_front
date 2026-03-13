import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { Supplier } from './entities/supplier.entity';

@Controller('api/suppliers')
export class SuppliersController {
  constructor(private readonly svc: SuppliersService) {}

  @Get() findAll() { return this.svc.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: Partial<Supplier>) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: Partial<Supplier>) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
