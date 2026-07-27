import { DataSource } from 'typeorm';
import { SettingsService, type MeasurementStandard } from './settings.service';
export declare class SettingsController {
    private readonly dataSource;
    private readonly settingsService;
    constructor(dataSource: DataSource, settingsService: SettingsService);
    getMeasurement(): Promise<import("./settings.service").MeasurementSettings>;
    updateMeasurement(body: {
        standard?: MeasurementStandard;
        marla_sqft?: number;
    }): Promise<import("./settings.service").MeasurementSettings>;
    reset(body: {
        mode: 'transactions' | 'full';
        confirm: string;
    }): Promise<{
        success: boolean;
        message: string;
        mode?: undefined;
        tablesCleared?: undefined;
    } | {
        success: boolean;
        mode: "transactions" | "full";
        tablesCleared: number;
        message: string;
    }>;
}
