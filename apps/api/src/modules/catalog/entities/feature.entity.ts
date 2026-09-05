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
import { ProjectType } from './project-type.entity';

// Features are the checkbox-able building blocks used by the Estimation Wizard
// (Phase 1B) to compose an estimate for a given project type.
@Entity('features')
export class Feature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectType, (projectType) => projectType.features, { nullable: false })
  @JoinColumn({ name: 'project_type_id' })
  projectType: ProjectType;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Baseline effort estimate in hours for this feature — used as a starting
  // point by the (future) Pricing/Estimation Engine, not a final price.
  @Column({ type: 'numeric', precision: 8, scale: 2, default: 0 })
  baselineHours: string; // numeric comes back as string from pg driver

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
