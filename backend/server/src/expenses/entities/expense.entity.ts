import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  project_id: string;

  @Column({ type: 'bigint', unsigned: true })
  project_stage_id: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'enum', enum: ['SUPPLIER', 'LABOUR', 'OTHER'] })
  vendor_type: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  supplier_id: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  contractor_id: string | null;

  /** DIRECT = pay now; BILL = accrual payable then pay later */
  @Column({ type: 'enum', enum: ['DIRECT', 'BILL'], default: 'DIRECT' })
  entry_mode: string;

  @Column({ type: 'varchar', length: 50 })
  payment_type: string;

  /** Partner bank used for Direct cash/bank payment (optional for pure Cash). */
  @Column({ type: 'bigint', unsigned: true, nullable: true })
  bank_account_id: string | null;

  @Column({ type: 'date' })
  expense_date: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  paid_amount: string;

  /** Paid | Unpaid | Partial */
  @Column({ type: 'varchar', length: 20, default: 'Paid' })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  cash_transaction_id: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
