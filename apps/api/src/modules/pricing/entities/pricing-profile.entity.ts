import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PricingRule } from './pricing-rule.entity';

// A named pricing configuration: an hourly rate plus a hard minimum-price
// floor. Complexity/urgency multipliers live on PricingRule, referenced by
// key, so pricing stays structured/data-driven rather than a formula engine.
// See MEMORY.md Section 05 (Business rules) and ADR-004.
@Entity('pricing_profiles')
export class PricingProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Integer cents — no floating point for money. See Section 05.
  @Column({ type: 'integer' })
  baseHourlyRateCents: number;

  // Hard floor for the SYSTEM-CALCULATED price. A human can still manually
  // adjust an estimate below this with a required justification (see
  // Estimate.adjustmentJustification) — the floor guards the automatic
  // recommendation, not human judgment.
  @Column({ type: 'integer' })
  minimumPriceCents: number;

  // Phase 2 task 4 — full multi-currency, no conversion between currencies.
  // ISO 4217 code (e.g. 'USD', 'EUR', 'GBP'). Validated against a small
  // allow-list at the DTO layer, not enforced in the DB beyond length.
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => PricingRule, (rule) => rule.profile)
  rules: PricingRule[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
