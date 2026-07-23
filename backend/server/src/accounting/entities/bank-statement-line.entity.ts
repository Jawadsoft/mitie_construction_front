import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bank_statement_lines')
export class BankStatementLine {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  bank_account_id: string;

  @Column({ type: 'date' })
  statement_date: string;

  @Column({ type: 'date', nullable: true })
  value_date: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'boolean', default: false })
  reconciled: boolean;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  cash_transaction_id: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  journal_entry_id: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reconciled_at: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
