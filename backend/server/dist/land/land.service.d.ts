import { Repository } from 'typeorm';
import { LandParcel } from './entities/land-parcel.entity';
export declare class LandService {
    private readonly parcelRepo;
    constructor(parcelRepo: Repository<LandParcel>);
    findAll(project_id?: string): Promise<LandParcel[]>;
    findOne(id: string): Promise<LandParcel>;
    create(dto: Partial<LandParcel>): Promise<LandParcel>;
    update(id: string, dto: Partial<LandParcel>): Promise<LandParcel>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
