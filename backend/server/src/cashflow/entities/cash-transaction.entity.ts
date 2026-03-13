import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cash_transactions')
export class CashTransaction {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'date' })
  transaction_date: string;

  @Column({ type: 'enum', enum: ['IN', 'OUT'] })
  type: 'IN' | 'OUT';

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 50 })
  method: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference_no: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  project_id: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  project_stage_id: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  related_entity_type: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  related_entity_id: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
