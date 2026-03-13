import { DataSource } from 'typeorm';
export declare class SettingsController {
    private readonly dataSource;
    constructor(dataSource: DataSource);
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
