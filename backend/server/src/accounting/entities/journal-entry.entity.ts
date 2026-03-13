import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('journal_entries')
export class JournalEntry {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'date' })
  entry_date: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference_no: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ['Draft', 'Posted'], default: 'Draft' })
  status: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  project_id: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
