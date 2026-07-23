import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { LandService } from './land.service';

@Controller('api/land/parcels')
export class LandController {
  constructor(private readonly svc: LandService) {}

  @Get()
  findAll(@Query('project_id') project_id?: string) {
    return this.svc.findAll(project_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.svc.create(dto);
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
