import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export const FUND_SOURCE_STATUSES = [
  'Committed',
  'Partially_Received',
  'Fully_Received',
  'Cancelled',
] as const;

@Entity('fund_sources')
export class FundSource {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  /** Legacy project link — optional; prefer bank_account_id for partner banks. */
  @Column({ type: 'bigint', unsigned: true, nullable: true })
  project_id: string | null;

  /** Partner bank (accounting bank_accounts) receiving / holding this fund source. */
  @Column({ type: 'bigint', unsigned: true, nullable: true })
  bank_account_id: string | null;

  @Column({ type: 'varchar', length: 150 })
  source_name: string;

  @Column({ type: 'enum', enum: ['EQUITY', 'LOAN', 'INVESTOR', 'ADVANCE_SALES', 'OTHER'] })
  source_type: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total_committed: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  received_so_far: string;

  /**
   * Committed | Partially_Received | Fully_Received | Cancelled
   * Derived from receipts except Cancelled (manual).
   */
  @Column({ type: 'varchar', length: 30, default: 'Committed' })
  status: string;

  @Column({ type: 'date', nullable: true })
  expected_date: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
