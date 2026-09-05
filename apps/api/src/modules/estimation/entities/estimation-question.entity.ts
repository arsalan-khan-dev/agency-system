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
import { ProjectType } from '../../catalog/entities/project-type.entity';
import { PricingRuleType } from '../../pricing/entities/pricing-rule.entity';

export interface EstimationQuestionOption {
  key: string; // must match a PricingRule.key of the same ruleType on the chosen profile
  label: string;
}

// A multiple-choice question shown by the Estimation Wizard for a given
// project type. Its answerType determines whether the selected option's
// `key` is used as the complexity or urgency lookup key when pricing.
@Entity('estimation_questions')
export class EstimationQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectType, { nullable: false })
  @JoinColumn({ name: 'project_type_id' })
  projectType: ProjectType;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'varchar', length: 20 })
  answerType: PricingRuleType;

  @Column({ type: 'jsonb' })
  options: EstimationQuestionOption[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
