import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('expense_payments')
export class ExpensePayment {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  expense_id: string;

  @Column({ type: 'date' })
  paid_date: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 50, default: 'Cash' })
  payment_method: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  bank_account_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
