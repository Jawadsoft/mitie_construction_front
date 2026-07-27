import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { LandParcel } from '../land/entities/land-parcel.entity';
import { Customer } from '../sales/entities/customer.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, LandParcel, Customer, Sale, Expense, Supplier]),
    AuthModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
