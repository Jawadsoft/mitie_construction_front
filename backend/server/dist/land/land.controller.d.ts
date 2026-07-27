import { LandService } from './land.service';
export declare class LandController {
    private readonly svc;
    constructor(svc: LandService);
    findAll(project_id?: string): Promise<import("./entities/land-parcel.entity").LandParcel[]>;
    findOne(id: string): Promise<import("./entities/land-parcel.entity").LandParcel>;
    create(dto: any): Promise<import("./entities/land-parcel.entity").LandParcel>;
    update(id: string, dto: any): Promise<import("./entities/land-parcel.entity").LandParcel>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
