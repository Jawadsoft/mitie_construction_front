import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FundSource } from './fund-source.entity';

@Entity('fund_transactions')
export class FundTransaction {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  fund_source_id: string;

  @Column({ type: 'date' })
  transaction_date: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference_no: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  cash_transaction_id: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => FundSource)
  @JoinColumn({ name: 'fund_source_id' })
  fund_source: FundSource;
}
