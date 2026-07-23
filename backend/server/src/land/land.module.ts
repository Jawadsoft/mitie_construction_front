import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandParcel } from './entities/land-parcel.entity';
import { LandService } from './land.service';
import { LandController } from './land.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LandParcel])],
  controllers: [LandController],
  providers: [LandService],
  exports: [LandService, TypeOrmModule],
})
export class LandModule {}
