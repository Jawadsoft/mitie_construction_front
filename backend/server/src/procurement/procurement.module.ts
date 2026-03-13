import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PoItem } from './entities/po-item.entity';
import { MaterialReceipt } from './entities/material-receipt.entity';
import { ProcurementService } from './procurement.service';
import { ProcurementController } from './procurement.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseOrder, PoItem, MaterialReceipt])],
  controllers: [ProcurementController],
  providers: [ProcurementService],
  exports: [ProcurementService, TypeOrmModule],
})
export class ProcurementModule {}
