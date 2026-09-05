import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

// Roles are intentionally simple and fixed for MVP (single-tenant, no dynamic
// permission builder). See MEMORY.md Section 13 (Security) / Section 05 (Business rules).
export type RoleName = 'admin' | 'manager' | 'estimator' | 'viewer';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  name: RoleName;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}
