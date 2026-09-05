import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Estimate } from './estimate.entity';
import { Feature } from '../../catalog/entities/feature.entity';

// Snapshot join: preserves the feature's baselineHours AT THE TIME the
// estimate was created, so later edits to the catalog feature never rewrite
// history. See MEMORY.md Section 05 (Business rules).
@Entity('estimate_features')
export class EstimateFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Estimate, (estimate) => estimate.features, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estimate_id' })
  estimate: Estimate;

  @ManyToOne(() => Feature, { nullable: false })
  @JoinColumn({ name: 'feature_id' })
  feature: Feature;

  @Column({ type: 'varchar', length: 150 })
  featureNameSnapshot: string;

  @Column({ type: 'numeric', precision: 8, scale: 2 })
  baselineHoursSnapshot: string;
}
