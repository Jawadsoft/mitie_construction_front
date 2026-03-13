import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabourContractor } from './entities/labour-contractor.entity';
import { LabourAttendance } from './entities/labour-attendance.entity';
import { LabourPayment } from './entities/labour-payment.entity';
import { LabourAdvance } from './entities/labour-advance.entity';
import { LabourService } from './labour.service';
import { LabourController } from './labour.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LabourContractor, LabourAttendance, LabourPayment, LabourAdvance])],
  controllers: [LabourController],
  providers: [LabourService],
  exports: [LabourService, TypeOrmModule],
})
export class LabourModule {}
