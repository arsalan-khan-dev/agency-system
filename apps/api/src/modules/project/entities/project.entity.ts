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
import { Quotation } from '../../quotation/entities/quotation.entity';
import { Client } from '../../client/entities/client.entity';
import { ProjectActual } from './project-actual.entity';
import { Expense } from './expense.entity';

export type ProjectStatus = 'active' | 'completed' | 'cancelled';

// Created ONLY from an accepted Quotation — see MEMORY.md Section 05:
// "Project is created only after quotation acceptance." budgetCentsSnapshot
// is copied from the quotation at creation time and never recalculated, so
// later quotation/estimate edits (which shouldn't happen post-acceptance
// anyway) can never silently move the goalposts on a running project.
@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Quotation, { nullable: false })
  @JoinColumn({ name: 'quotation_id' })
  quotation: Quotation;

  @ManyToOne(() => Client, { nullable: false })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'integer' })
  budgetCentsSnapshot: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: ProjectStatus;

  @OneToMany(() => ProjectActual, (actual) => actual.project)
  actuals: ProjectActual[];

  @OneToMany(() => Expense, (expense) => expense.project)
  expenses: Expense[];

  @Column({ type: 'timestamptz' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
