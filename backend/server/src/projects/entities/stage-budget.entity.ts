import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProjectStage } from './project-stage.entity';

@Entity('stage_budgets')
export class StageBudget {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  project_stage_id: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  labour_budget: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  material_budget: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  equipment_budget: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  other_budget: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: '0.00' })
  total_budget: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @OneToOne(() => ProjectStage, (stage) => stage.budget)
  @JoinColumn({ name: 'project_stage_id' })
  stage: ProjectStage;
}
