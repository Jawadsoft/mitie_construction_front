import { DataSource, Repository } from 'typeorm';
import { LabourContractor } from './entities/labour-contractor.entity';
import { LabourAttendance } from './entities/labour-attendance.entity';
import { LabourPayment } from './entities/labour-payment.entity';
import { LabourAdvance } from './entities/labour-advance.entity';
import { AccountingService } from '../accounting/accounting.service';
export declare class LabourService {
    private readonly contractorsRepo;
    private readonly attendanceRepo;
    private readonly paymentsRepo;
    private readonly advancesRepo;
    private readonly dataSource;
    private readonly accounting;
    constructor(contractorsRepo: Repository<LabourContractor>, attendanceRepo: Repository<LabourAttendance>, paymentsRepo: Repository<LabourPayment>, advancesRepo: Repository<LabourAdvance>, dataSource: DataSource, accounting: AccountingService);
    findAllContractors(): Promise<LabourContractor[]>;
    findOneContractor(id: string): Promise<LabourContractor>;
    createContractor(dto: Partial<LabourContractor>): Promise<LabourContractor>;
    updateContractor(id: string, dto: Partial<LabourContractor>): Promise<LabourContractor>;
    findAttendance(filters: {
        project_id?: string;
        contractor_id?: string;
    }): Promise<LabourAttendance[]>;
    createAttendance(dto: Partial<LabourAttendance>): Promise<LabourAttendance>;
    calculateWages(project_id?: string, contractor_id?: string): Promise<{
        contractor_id: any;
        contractor_name: any;
        daily_rate: number;
        total_days: number;
        gross_wages: number;
        total_paid: number;
        advances_given: number;
        balance_due: number;
    }[]>;
    findPayments(filters: {
        project_id?: string;
        contractor_id?: string;
    }): Promise<LabourPayment[]>;
    private postPaymentJournal;
    createPayment(dto: Partial<LabourPayment>): Promise<LabourPayment | null>;
    findAdvances(filters: {
        project_id?: string;
        contractor_id?: string;
    }): Promise<LabourAdvance[]>;
    createAdvance(dto: Partial<LabourAdvance>): Promise<LabourAdvance>;
    deleteContractor(id: string): Promise<{
        deleted: boolean;
    }>;
    updateAttendance(id: string, dto: Partial<LabourAttendance>): Promise<LabourAttendance | null>;
    deleteAttendance(id: string): Promise<{
        deleted: boolean;
    }>;
    updatePayment(id: string, dto: Partial<LabourPayment>): Promise<LabourPayment | null>;
    deletePayment(id: string): Promise<{
        deleted: boolean;
    }>;
}
