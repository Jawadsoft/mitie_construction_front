import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Material } from './material.entity';

@Entity('material_issues')
export class MaterialIssue {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  material_id: string;

  @Column({ type: 'bigint', unsigned: true })
  project_id: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  project_stage_id: string | null;

  @Column({ type: 'date' })
  issue_date: string;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  unit_cost: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  total_cost: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  purpose: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference_no: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;
}
