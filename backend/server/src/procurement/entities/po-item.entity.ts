import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';

@Entity('po_items')
export class PoItem {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  purchase_order_id: string;

  @Column({ type: 'varchar', length: 200 })
  material_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  quantity: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  unit_price: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total_price: string;

  @Column({ type: 'decimal', precision: 15, scale: 3, default: '0.000' })
  received_qty: string;

  @ManyToOne(() => PurchaseOrder)
  @JoinColumn({ name: 'purchase_order_id' })
  purchase_order: PurchaseOrder;
}
