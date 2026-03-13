import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('fund_sources')
export class FundSource {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  project_id: string;

  @Column({ type: 'varchar', length: 150 })
  source_name: string;

  @Column({ type: 'enum', enum: ['EQUITY', 'LOAN', 'INVESTOR', 'ADVANCE_SALES', 'OTHER'] })
  source_type: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total_committed: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  received_so_far: string;

  @Column({ type: 'date', nullable: true })
  expected_date: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
