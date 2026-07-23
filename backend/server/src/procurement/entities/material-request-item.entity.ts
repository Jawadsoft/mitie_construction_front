import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MaterialRequest } from './material-request.entity';

@Entity('material_request_items')
export class MaterialRequestItem {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  material_request_id: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  material_id: string | null;

  @Column({ type: 'varchar', length: 150 })
  material_name: string;

  @Column({ type: 'varchar', length: 30 })
  unit: string;

  @Column({ type: 'decimal', precision: 18, scale: 3 })
  quantity_requested: string;

  @Column({ type: 'decimal', precision: 18, scale: 3, nullable: true })
  quantity_approved: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  estimated_unit_cost: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => MaterialRequest)
  @JoinColumn({ name: 'material_request_id' })
  material_request: MaterialRequest;
}
