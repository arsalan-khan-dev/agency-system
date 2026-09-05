import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Minimal audit trail. Populated manually for auth events in Phase 1A;
// a generic interceptor for all mutating routes is planned for Phase 1B/C.
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 100 })
  action: string; // e.g. 'auth.login', 'catalog.service.create'

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityType: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
