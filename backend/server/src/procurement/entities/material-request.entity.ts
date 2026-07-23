import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('material_requests')
export class MaterialRequest {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  request_no: string;

  @Column({ type: 'bigint', unsigned: true })
  project_id: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  project_stage_id: string | null;

  @Column({ type: 'bigint', unsigned: true })
  requested_by: string;

  @Column({ type: 'date' })
  request_date: string;

  @Column({ type: 'date', nullable: true })
  needed_by_date: string | null;

  @Column({
    type: 'enum',
    enum: ['Draft', 'Submitted', 'Approved', 'Rejected', 'Converted', 'Cancelled'],
    default: 'Draft',
  })
  status: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  approved_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  purchase_order_id: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
