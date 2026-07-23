import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('land_parcels')
export class LandParcel {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  project_id: string | null;

  @Column({ type: 'varchar', length: 100 })
  plot_number: string;

  @Column({ type: 'varchar', length: 150 })
  owner_name: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  owner_cnic: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  owner_phone: string | null;

  @Column({ type: 'varchar', length: 255 })
  location: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  area: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  area_sqft: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  purchase_agreement_no: string | null;

  @Column({ type: 'date', nullable: true })
  purchase_agreement_date: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  purchase_agreement_file: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sale_deed_no: string | null;

  @Column({ type: 'date', nullable: true })
  sale_deed_date: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  sale_deed_registrar: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  sale_deed_file: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  purchase_price: string | null;

  @Column({ type: 'date', nullable: true })
  purchase_date: string | null;

  @Column({ type: 'varchar', length: 50, default: 'Owned' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
