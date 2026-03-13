import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProjectStage } from './project-stage.entity';

@Entity('stage_progress')
export class StageProgress {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  project_stage_id: string;

  @Column({ type: 'date' })
  report_date: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  completion_percent: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', default: false })
  has_delay: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => ProjectStage, (stage) => stage.progressLogs)
  @JoinColumn({ name: 'project_stage_id' })
  stage: ProjectStage;
}
