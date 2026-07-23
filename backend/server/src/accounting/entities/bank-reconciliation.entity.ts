import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bank_reconciliations')
export class BankReconciliation {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  bank_account_id: string;

  @Column({ type: 'date' })
  period_start: string;

  @Column({ type: 'date' })
  period_end: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  statement_ending_balance: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  book_ending_balance: string | null;

  @Column({ type: 'varchar', length: 30, default: 'Open' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  created_by: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
