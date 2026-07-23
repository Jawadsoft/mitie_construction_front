import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LandParcel } from './entities/land-parcel.entity';

@Injectable()
export class LandService {
  constructor(
    @InjectRepository(LandParcel)
    private readonly parcelRepo: Repository<LandParcel>,
  ) {}

  findAll(project_id?: string) {
    const q = this.parcelRepo.createQueryBuilder('p').orderBy('p.created_at', 'DESC');
    if (project_id) q.andWhere('p.project_id = :pid', { pid: project_id });
    return q.getMany();
  }

  async findOne(id: string) {
    const parcel = await this.parcelRepo.findOne({ where: { id } });
    if (!parcel) throw new NotFoundException('Land parcel not found');
    return parcel;
  }

  create(dto: Partial<LandParcel>) {
    return this.parcelRepo.save(this.parcelRepo.create(dto));
  }

  async update(id: string, dto: Partial<LandParcel>) {
    await this.findOne(id);
    await this.parcelRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.parcelRepo.delete(id);
    return { deleted: true };
  }
}
