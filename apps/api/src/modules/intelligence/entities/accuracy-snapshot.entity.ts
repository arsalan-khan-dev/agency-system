import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from '../../project/entities/project.entity';

// One row per completed project, written once at completion time (see
// ProjectService.updateStatus). This is a persisted snapshot, not a live
// view — MEMORY.md Section 19 (Phase 2 task 1) calls for aggregating
// accuracy over time rather than recomputing it from actuals/expenses on
// every dashboard load. Values are captured at completion and never
// recalculated afterward, matching the snapshot-at-time-of-event pattern
// already used for Estimate/Quotation (see Section 05).
@Entity('accuracy_snapshots')
export class AccuracySnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'numeric', precision: 8, scale: 2 })
  estimatedHours: string;

  @Column({ type: 'numeric', precision: 8, scale: 2 })
  actualHours: string;

  // actualHours - estimatedHours. Positive = ran over on hours.
  @Column({ type: 'numeric', precision: 8, scale: 2 })
  hoursVariance: string;

  // hoursVariance / estimatedHours, as a fraction (0.25 = 25% over).
  @Column({ type: 'numeric', precision: 8, scale: 4 })
  hoursVariancePct: string;

  @Column({ type: 'integer' })
  budgetCents: number;

  @Column({ type: 'integer' })
  actualCostCents: number;

  // actualCostCents - budgetCents. Positive = went over budget.
  @Column({ type: 'integer' })
  costVarianceCents: number;

  @Column({ type: 'numeric', precision: 8, scale: 4 })
  costVariancePct: string;

  // Denormalized at capture time so historical trends by project type
  // survive a project type being renamed/deactivated later.
  @Column({ type: 'varchar', length: 150 })
  projectTypeNameSnapshot: string;

  @CreateDateColumn({ name: 'captured_at' })
  capturedAt: Date;
}
