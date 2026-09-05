import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from '../../identity/entities/user.entity';

// Actual hours worked, logged against a running project. See MEMORY.md
// Section 09 (Financial Reconciliation module) and ADR-013 for the hourly
// cost basis used when converting hours to a cost figure for profitability.
@Entity('project_actuals')
export class ProjectActual {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, (project) => project.actuals, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar', length: 200 })
  description: string;

  @Column({ type: 'numeric', precision: 8, scale: 2 })
  hoursLogged: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'logged_by_user_id' })
  loggedBy: User | null;

  @Column({ type: 'timestamptz' })
  loggedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
