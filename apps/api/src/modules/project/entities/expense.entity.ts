import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from './project.entity';

// Integer cents — no floating point for money. See MEMORY.md Section 05.
@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, (project) => project.expenses, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar', length: 200 })
  description: string;

  @Column({ type: 'integer' })
  amountCents: number;

  @Column({ type: 'timestamptz' })
  incurredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
