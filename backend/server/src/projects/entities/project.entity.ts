import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProjectStage } from './project-stage.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  owner_name: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  manager_name: string | null;

  /** Legacy free-text; prefer plot_size_sqft for new data */
  @Column({ type: 'varchar', length: 100, nullable: true })
  plot_size: string | null;

  /** Canonical plot area in square feet */
  @Column({ type: 'numeric', precision: 14, scale: 4, nullable: true })
  plot_size_sqft: string | null;

  @Column({ type: 'date', nullable: true })
  start_date: string | null;

  @Column({ type: 'date', nullable: true })
  expected_completion_date: string | null;

  /** READY_PROPERTY | LAND */
  @Column({ type: 'varchar', length: 50, nullable: true })
  project_type: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  project_subtype: string | null;

  /** DIRECT_SALE | DEVELOPMENT */
  @Column({ type: 'varchar', length: 50, nullable: true })
  project_strategy: string | null;

  /** Derived Residential | Commercial | Land */
  @Column({ type: 'varchar', length: 100, nullable: true })
  asset_class: string | null;

  /** Obsolete — kept for DB sync compatibility; do not write */
  @Column({ type: 'varchar', length: 50, nullable: true })
  project_category: string | null;

  /** Obsolete — kept for DB sync compatibility; do not write */
  @Column({ type: 'varchar', length: 50, nullable: true })
  project_purpose: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  total_estimated_budget: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  target_sale_price: string | null;

  @Column({ type: 'varchar', length: 50, default: 'Planning' })
  status: string;

  /** Mid-construction whole-project sale (Sold As-Is) */
  @Column({ type: 'boolean', default: false })
  sold_as_is: boolean;

  @Column({ type: 'date', nullable: true })
  sold_at: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  sold_price: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  sold_buyer_name: string | null;

  @Column({ type: 'text', nullable: true })
  sold_notes: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @OneToMany(() => ProjectStage, (stage) => stage.project)
  stages: ProjectStage[];
}
