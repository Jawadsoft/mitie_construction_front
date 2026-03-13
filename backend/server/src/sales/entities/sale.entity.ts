import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { PropertyUnit } from './property-unit.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  property_unit_id: string;

  @Column({ type: 'bigint', unsigned: true })
  customer_id: string;

  @Column({ type: 'date' })
  sale_date: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total_sale_price: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  total_paid: string;

  @Column({ type: 'enum', enum: ['Active', 'Cancelled', 'Completed'], default: 'Active' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => PropertyUnit)
  @JoinColumn({ name: 'property_unit_id' })
  property_unit: PropertyUnit;
}
