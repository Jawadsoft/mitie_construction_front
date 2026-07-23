import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MaterialRequestsService } from './material-requests.service';

@Controller('api/material-requests')
export class MaterialRequestsController {
  constructor(private readonly svc: MaterialRequestsService) {}

  @Get()
  findAll(@Query('project_id') project_id?: string, @Query('status') status?: string) {
    return this.svc.findAll({ project_id, status });
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

  @Post(':id/submit')
  submit(@Param('id') id: string) {
    return this.svc.submit(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: any) {
    return this.svc.approve(id, dto);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: any) {
    return this.svc.reject(id, dto);
  }

  @Post(':id/convert-to-po')
  convertToPo(@Param('id') id: string, @Body() dto: any) {
    return this.svc.convertToPo(id, dto);
  }
}
