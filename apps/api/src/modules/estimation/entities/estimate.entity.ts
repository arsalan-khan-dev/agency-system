import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectType } from '../../catalog/entities/project-type.entity';
import { PricingProfile } from '../../pricing/entities/pricing-profile.entity';
import { User } from '../../identity/entities/user.entity';
import { EstimateFeature } from './estimate-feature.entity';

export type EstimateStatus = 'draft' | 'finalized';

// Every priced value here is a SNAPSHOT taken at calculation/finalize time.
// Historical estimates must preserve the values used at estimation time even
// if the underlying catalog/pricing data changes later. See MEMORY.md
// Section 05 (Business rules) and ADR-005 (immutability applies to
// quotations; the same snapshot principle is applied here one step earlier).
@Entity('estimates')
export class Estimate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Free-text working title for the estimate. Client linkage arrives with
  // the Client Management module (not yet built) — see MEMORY.md Section 04.
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @ManyToOne(() => ProjectType, { nullable: false })
  @JoinColumn({ name: 'project_type_id' })
  projectType: ProjectType;

  @ManyToOne(() => PricingProfile, { nullable: false })
  @JoinColumn({ name: 'pricing_profile_id' })
  pricingProfile: PricingProfile;

  @OneToMany(() => EstimateFeature, (ef) => ef.estimate, { cascade: true })
  features: EstimateFeature[];

  @Column({ type: 'varchar', length: 50 })
  complexityKey: string;

  @Column({ type: 'varchar', length: 50 })
  urgencyKey: string;

  // --- Snapshot of the calculation inputs/outputs at the time of pricing ---
  @Column({ type: 'numeric', precision: 8, scale: 2 })
  totalHoursSnapshot: string;

  @Column({ type: 'integer' })
  baseCostCentsSnapshot: number;

  @Column({ type: 'numeric', precision: 6, scale: 3 })
  complexityMultiplierSnapshot: string;

  @Column({ type: 'numeric', precision: 6, scale: 3 })
  urgencyMultiplierSnapshot: string;

  // System-calculated recommended price. Always >= profile.minimumPriceCents
  // at the moment it was calculated. See PricingService.
  @Column({ type: 'integer' })
  calculatedPriceCents: number;

  // Human override. Requires adjustmentJustification whenever set.
  @Column({ type: 'integer', nullable: true })
  manualAdjustedPriceCents: number | null;

  @Column({ type: 'text', nullable: true })
  adjustmentJustification: string | null;

  // The price actually used going forward = manualAdjustedPriceCents ?? calculatedPriceCents.
  @Column({ type: 'integer' })
  finalPriceCents: number;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: EstimateStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
