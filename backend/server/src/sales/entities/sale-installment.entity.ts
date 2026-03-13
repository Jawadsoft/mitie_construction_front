import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sale } from './sale.entity';

@Entity('sale_installments')
export class SaleInstallment {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  sale_id: string;

  @Column({ type: 'date' })
  due_date: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  due_amount: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  paid_amount: string;

  @Column({ type: 'date', nullable: true })
  paid_date: string | null;

  @Column({ type: 'enum', enum: ['Pending', 'Partial', 'Paid', 'Overdue'], default: 'Pending' })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @ManyToOne(() => Sale)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;
}
