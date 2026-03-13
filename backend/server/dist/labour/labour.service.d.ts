import { Repository } from 'typeorm';
import { LabourContractor } from './entities/labour-contractor.entity';
import { LabourAttendance } from './entities/labour-attendance.entity';
import { LabourPayment } from './entities/labour-payment.entity';
import { LabourAdvance } from './entities/labour-advance.entity';
export declare class LabourService {
    private readonly contractorsRepo;
    private readonly attendanceRepo;
    private readonly paymentsRepo;
    private readonly advancesRepo;
    constructor(contractorsRepo: Repository<LabourContractor>, attendanceRepo: Repository<LabourAttendance>, paymentsRepo: Repository<LabourPayment>, advancesRepo: Repository<LabourAdvance>);
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
    createPayment(dto: Partial<LabourPayment>): Promise<LabourPayment>;
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
