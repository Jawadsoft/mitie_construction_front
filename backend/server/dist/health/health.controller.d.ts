import { DataSource } from 'typeorm';
export declare class HealthController {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    ping(): {
        status: string;
        message: string;
    };
    getHealth(): Promise<{
        status: string;
        db: string;
        message?: undefined;
        error?: undefined;
    } | {
        status: string;
        message: string;
        error: string;
        db?: undefined;
    }>;
}
