import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';
export declare const GAZZ_SQFT = 9;
export declare const PAKISTAN_MARLA_SQFT = 272.25;
export type MeasurementStandard = 'PAKISTAN' | 'CUSTOM';
export interface MeasurementSettings {
    standard: MeasurementStandard;
    marla_sqft: number;
    gazz_sqft: number;
}
export declare class SettingsService {
    private readonly settingsRepo;
    constructor(settingsRepo: Repository<AppSetting>);
    private getRaw;
    private setRaw;
    getMeasurement(): Promise<MeasurementSettings>;
    updateMeasurement(body: {
        standard?: MeasurementStandard;
        marla_sqft?: number;
    }): Promise<MeasurementSettings>;
}
