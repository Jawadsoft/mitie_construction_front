import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('property_units')
export class PropertyUnit {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  project_id: string;

  @Column({ type: 'varchar', length: 50 })
  unit_number: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  unit_type: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  area_sqft: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  floor: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  list_price: string;

  @Column({ type: 'enum', enum: ['Available', 'Reserved', 'Sold', 'Blocked'], default: 'Available' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
