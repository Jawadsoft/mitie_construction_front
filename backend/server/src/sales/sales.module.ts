import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { PropertyUnit } from './entities/property-unit.entity';
import { Sale } from './entities/sale.entity';
import { SaleInstallment } from './entities/sale-installment.entity';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, PropertyUnit, Sale, SaleInstallment])],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService, TypeOrmModule],
})
export class SalesModule {}
