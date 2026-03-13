import { LabourService } from './labour.service';
export declare class LabourController {
    private readonly svc;
    constructor(svc: LabourService);
    findAllContractors(): Promise<import("./entities/labour-contractor.entity").LabourContractor[]>;
    findOneContractor(id: string): Promise<import("./entities/labour-contractor.entity").LabourContractor>;
    createContractor(dto: any): Promise<import("./entities/labour-contractor.entity").LabourContractor>;
    updateContractor(id: string, dto: any): Promise<import("./entities/labour-contractor.entity").LabourContractor>;
    deleteContractor(id: string): Promise<{
        deleted: boolean;
    }>;
    findAttendance(project_id?: string, contractor_id?: string): Promise<import("./entities/labour-attendance.entity").LabourAttendance[]>;
    createAttendance(dto: any): Promise<import("./entities/labour-attendance.entity").LabourAttendance>;
    updateAttendance(id: string, dto: any): Promise<import("./entities/labour-attendance.entity").LabourAttendance | null>;
    deleteAttendance(id: string): Promise<{
        deleted: boolean;
    }>;
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
    findPayments(project_id?: string, contractor_id?: string): Promise<import("./entities/labour-payment.entity").LabourPayment[]>;
    createPayment(dto: any): Promise<import("./entities/labour-payment.entity").LabourPayment>;
    updatePayment(id: string, dto: any): Promise<import("./entities/labour-payment.entity").LabourPayment | null>;
    deletePayment(id: string): Promise<{
        deleted: boolean;
    }>;
    findAdvances(project_id?: string, contractor_id?: string): Promise<import("./entities/labour-advance.entity").LabourAdvance[]>;
    createAdvance(dto: any): Promise<import("./entities/labour-advance.entity").LabourAdvance>;
}
