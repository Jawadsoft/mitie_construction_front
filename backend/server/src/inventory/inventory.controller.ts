import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('api/inventory')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  // ─── Material Catalog ─────────────────────────────────────────────────
  @Get('materials')
  findMaterials(@Query('category') category?: string) {
    return this.svc.findAllMaterials(category);
  }

  @Get('materials/categories')
  getCategories() { return this.svc.getCategories(); }

  @Get('materials/:id')
  findOne(@Param('id') id: string) { return this.svc.findOneMaterial(id); }

  @Post('materials')
  createMaterial(@Body() dto: any) { return this.svc.createMaterial(dto); }

  @Patch('materials/:id')
  updateMaterial(@Param('id') id: string, @Body() dto: any) { return this.svc.updateMaterial(id, dto); }
  @Delete('materials/:id') deleteMaterial(@Param('id') id: string) { return this.svc.deleteMaterial(id); }

  // ─── Stock Summary & Alerts ───────────────────────────────────────────
  @Get('stock')
  getStock(@Query('project_id') project_id?: string) {
    return this.svc.getStockSummary(project_id);
  }

  @Get('stock/low-alerts')
  getLowStock() { return this.svc.getLowStockAlerts(); }

  // ─── Stock Ledger ─────────────────────────────────────────────────────
  @Get('ledger')
  getLedger(
    @Query('material_id') material_id?: string,
    @Query('project_id') project_id?: string,
    @Query('movement_type') movement_type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.getLedger({ material_id, project_id, movement_type, from, to });
  }

  // ─── Receive Stock (purchase) ─────────────────────────────────────────
  @Post('receive')
  receiveStock(@Body() dto: any) { return this.svc.receiveStock(dto); }

  // ─── Issue Materials to Project ───────────────────────────────────────
  @Post('issue')
  issueMaterial(@Body() dto: any) { return this.svc.issueMaterial(dto); }

  // ─── Issues History ───────────────────────────────────────────────────
  @Get('issues')
  getIssues(
    @Query('project_id') project_id?: string,
    @Query('project_stage_id') project_stage_id?: string,
    @Query('material_id') material_id?: string,
  ) {
    return this.svc.getIssues({ project_id, project_stage_id, material_id });
  }

  // ─── Adjustment / Return ─────────────────────────────────────────────
  @Post('adjust')
  adjustStock(@Body() dto: any) { return this.svc.adjustStock(dto); }

  // ─── Project Utilization Report ───────────────────────────────────────
  @Get('utilization/:project_id')
  getUtilization(@Param('project_id') project_id: string) {
    return this.svc.getProjectUtilization(project_id);
  }
}

