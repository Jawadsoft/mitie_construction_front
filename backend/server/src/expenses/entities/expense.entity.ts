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

  @Column({ type: 'varchar', length: 50 })
  payment_type: string;

  @Column({ type: 'date' })
  expense_date: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  cash_transaction_id: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
