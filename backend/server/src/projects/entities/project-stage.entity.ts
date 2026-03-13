import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { StageBudget } from './stage-budget.entity';
import { StageProgress } from './stage-progress.entity';

@Entity('project_stages')
export class ProjectStage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  project_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  sequence_order: number;

  @Column({ type: 'date', nullable: true })
  start_date: string | null;

  @Column({ type: 'date', nullable: true })
  end_date: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: '0.00' })
  completion_percent: string;

  @Column({ type: 'varchar', length: 50, default: 'Planned' })
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @ManyToOne(() => Project, (project) => project.stages)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToOne(() => StageBudget, (budget) => budget.stage)
  budget: StageBudget;

  @OneToMany(() => StageProgress, (progress) => progress.stage)
  progressLogs: StageProgress[];
}
