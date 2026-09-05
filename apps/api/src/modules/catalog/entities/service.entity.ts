import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceCategory } from './service-category.entity';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ServiceCategory, (category) => category.services, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: ServiceCategory;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Base unit cost stored as integer cents — no floating point for money.
  // See MEMORY.md Section 05 (Business rules).
  @Column({ type: 'integer', default: 0 })
  baseUnitCostCents: number;

  @Column({ type: 'varchar', length: 20, default: 'hour' })
  unit: string; // e.g. 'hour', 'flat', 'day'

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
