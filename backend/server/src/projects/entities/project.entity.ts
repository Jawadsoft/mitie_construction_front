import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProjectStage } from './project-stage.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  plot_size: string | null;

  @Column({ type: 'date', nullable: true })
  start_date: string | null;

  @Column({ type: 'date', nullable: true })
  expected_completion_date: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  project_type: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  total_estimated_budget: string | null;

  @Column({ type: 'varchar', length: 50, default: 'Planning' })
  status: string;

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
