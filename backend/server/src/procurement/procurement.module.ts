import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PoItem } from './entities/po-item.entity';
import { MaterialReceipt } from './entities/material-receipt.entity';
import { MaterialRequest } from './entities/material-request.entity';
import { MaterialRequestItem } from './entities/material-request-item.entity';
import { ProcurementService } from './procurement.service';
import { ProcurementController } from './procurement.controller';
import { MaterialRequestsService } from './material-requests.service';
import { MaterialRequestsController } from './material-requests.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PoItem,
      MaterialReceipt,
      MaterialRequest,
      MaterialRequestItem,
    ]),
    forwardRef(() => InventoryModule),
  ],
  controllers: [ProcurementController, MaterialRequestsController],
  providers: [ProcurementService, MaterialRequestsService],
  exports: [ProcurementService, MaterialRequestsService, TypeOrmModule],
})
export class ProcurementModule {}
