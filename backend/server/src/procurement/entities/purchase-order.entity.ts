import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  project_id: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  project_stage_id: string | null;

  @Column({ type: 'bigint', unsigned: true })
  supplier_id: string;

  @Column({ type: 'date' })
  order_date: string;

  @Column({ type: 'date', nullable: true })
  expected_delivery: string | null;

  @Column({ type: 'enum', enum: ['Draft', 'Approved', 'Received', 'Cancelled'], default: 'Draft' })
  status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  total_amount: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
