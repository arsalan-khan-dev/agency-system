import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PricingProfile } from './pricing-profile.entity';

export type PricingRuleType = 'complexity' | 'urgency';

// A single structured multiplier, e.g. (profile=Standard, type=complexity,
// key=high) -> 1.5x. Deliberately NOT a formula engine — every rule is a
// flat key->multiplier lookup. See MEMORY.md ADR-004.
@Entity('pricing_rules')
@Index(['profile', 'ruleType', 'key'], { unique: true })
export class PricingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PricingProfile, (profile) => profile.rules, { nullable: false })
  @JoinColumn({ name: 'profile_id' })
  profile: PricingProfile;

  @Column({ type: 'varchar', length: 20 })
  ruleType: PricingRuleType;

  // e.g. 'low' | 'medium' | 'high' for complexity, 'standard' | 'rush' for urgency.
  @Column({ type: 'varchar', length: 50 })
  key: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  // Stored as numeric via pg driver -> string in JS. e.g. "1.25"
  @Column({ type: 'numeric', precision: 6, scale: 3 })
  multiplier: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
