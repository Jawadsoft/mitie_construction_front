import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LabourContractor } from './labour-contractor.entity';

@Entity('labour_attendance')
export class LabourAttendance {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  contractor_id: string;

  @Column({ type: 'bigint', unsigned: true })
  project_id: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  project_stage_id: string | null;

  @Column({ type: 'date' })
  attendance_date: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: '1.00' })
  present_days: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => LabourContractor)
  @JoinColumn({ name: 'contractor_id' })
  contractor: LabourContractor;
}
